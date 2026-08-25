import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type RESTPostAPIApplicationCommandsJSONBody,
} from 'discord.js'
import { BRANDS } from '../brands.js'
import type { AgentContext } from '../context.js'
import { linkAccount } from '../identity.js'
import { addDaysISO, formatDateTime, formatDuration, todayISO } from '../dates.js'

/**
 * Les raccourcis « / » de Discord. Ils NE passent PAS par Claude Code : chaque
 * commande fait sa requête et rend le résultat mis en forme.
 *
 * C'est délibéré. Un raccourci sert à voir sa liste en une seconde, sans
 * consommer d'appel au modèle et sans risque de reformulation. Tout ce qui
 * demande du jugement reste une phrase adressée à l'agent.
 *
 * Le client Supabase porte le JWT de l'utilisateur, comme côté MCP : la RLS
 * reste le garde-fou.
 */

type Deps = {
  /** Oublie le fil de conversation Claude du salon courant. */
  resetSession: (channelId: string) => void
  /** Message d'erreur si l'identifiant Discord n'est pas dans la liste blanche. */
  isAllowed: (discordUserId: string) => boolean
}

export type CommandDef =
  | {
      data: RESTPostAPIApplicationCommandsJSONBody
      needsSession: true
      run: (i: ChatInputCommandInteraction, ctx: AgentContext, deps: Deps) => Promise<string>
    }
  | {
      data: RESTPostAPIApplicationCommandsJSONBody
      needsSession: false
      run: (i: ChatInputCommandInteraction, deps: Deps) => Promise<string>
    }

/** Les marques, en choix d'option — dérivées de BRANDS pour ne pas diverger. */
const MARQUE_CHOICES = Object.values(BRANDS).map(b => ({ name: b.label, value: b.groupe }))

const PRIORITE_ICONE: Record<string, string> = {
  urgent: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '⚪',
}

const STATUT_LABEL: Record<string, string> = {
  todo: 'à faire',
  in_progress: 'en cours',
  done: 'faite',
  cancelled: 'annulée',
}

/** « 12/08 », pour tenir sur une ligne de liste. */
function jourCourt(iso: string): string {
  const [, m = '', d = ''] = iso.split('-')
  return `${d}/${m}`
}

type Groupe = { titre: string; lignes: string[] }

/**
 * Range une échéance dans l'un des paniers affichés, dans cet ordre. Le tri par
 * date reste celui de la requête : on ne fait que découper.
 */
function panier(due: string | null, today: string): string {
  if (!due) return 'Sans échéance'
  if (due < today) return '⚠️ En retard'
  if (due === today) return "Aujourd'hui"
  if (due === addDaysISO(today, 1)) return 'Demain'
  if (due <= addDaysISO(today, 7)) return 'Cette semaine'
  return 'Plus tard'
}

const ORDRE_PANIERS = [
  '⚠️ En retard',
  "Aujourd'hui",
  'Demain',
  'Cette semaine',
  'Plus tard',
  'Sans échéance',
]

/** id -> nom de projet, pour afficher un rattachement lisible. */
async function projectNames(ctx: AgentContext): Promise<Map<string, string>> {
  const { data } = await ctx.db.from('projects').select('id, name')
  return new Map((data ?? []).map(p => [p.id as string, p.name as string]))
}

/** Ids des projets d'une marque — le groupe vit sur le projet, pas sur la tâche. */
async function projectIdsForBrand(ctx: AgentContext, groupe: string): Promise<Set<string>> {
  const { data } = await ctx.db.from('projects').select('id').ilike('groupe', groupe)
  return new Set((data ?? []).map(p => p.id as string))
}

function rendreGroupes(entete: string, groupes: Groupe[]): string {
  const corps = groupes
    .filter(g => g.lignes.length > 0)
    .map(g => `**${g.titre}**\n${g.lignes.join('\n')}`)
    .join('\n\n')
  return `${entete}\n\n${corps}`
}

export const commands: CommandDef[] = [
  {
    needsSession: true,
    data: new SlashCommandBuilder()
      .setName('todo')
      .setDescription('Tes tâches ouvertes, groupées par échéance')
      .addStringOption(o =>
        o
          .setName('marque')
          .setDescription('Filtre par marque. Par défaut : celle du salon.')
          .addChoices(...MARQUE_CHOICES, { name: 'Toutes', value: 'toutes' }),
      )
      .addStringOption(o =>
        o
          .setName('quand')
          .setDescription('Fenêtre d\'échéance')
          .addChoices(
            { name: 'En retard', value: 'retard' },
            { name: "Aujourd'hui", value: 'jour' },
            { name: '7 jours', value: 'semaine' },
            { name: 'Tout', value: 'tout' },
          ),
      )
      .addStringOption(o =>
        o
          .setName('statut')
          .setDescription('Par défaut : à faire + en cours')
          .addChoices(
            { name: 'À faire', value: 'todo' },
            { name: 'En cours', value: 'in_progress' },
            { name: 'Faites', value: 'done' },
            { name: 'Annulées', value: 'cancelled' },
          ),
      )
      .toJSON(),
    run: async (i, ctx) => {
      const today = todayISO(ctx.timezone)
      const statut = i.options.getString('statut')
      const quand = i.options.getString('quand') ?? 'tout'
      const marqueOpt = i.options.getString('marque')
      const marque =
        marqueOpt === 'toutes' ? null : (marqueOpt ?? ctx.brand?.groupe ?? null)

      let query = ctx.db
        .from('tasks')
        .select('id, title, status, priority, due_date, project_id, estimated_minutes')

      if (statut) query = query.eq('status', statut)
      else query = query.in('status', ['todo', 'in_progress'])

      if (quand === 'retard') query = query.lt('due_date', today)
      if (quand === 'jour') query = query.lte('due_date', today)
      if (quand === 'semaine') query = query.lte('due_date', addDaysISO(today, 7))

      const { data, error } = await query
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority')
        .limit(60)

      if (error) return `Erreur : ${error.message}`
      let rows = data ?? []

      if (marque && rows.length > 0) {
        const ids = await projectIdsForBrand(ctx, marque)
        rows = rows.filter(r => r.project_id && ids.has(r.project_id as string))
      }

      const portee = marque ? ` — ${marque}` : ''
      if (rows.length === 0) return `Aucune tâche ne correspond${portee}.`

      const noms = await projectNames(ctx)
      const groupes: Groupe[] = ORDRE_PANIERS.map(titre => ({ titre, lignes: [] }))

      for (const r of rows) {
        const due = (r.due_date as string | null) ?? null
        const cible = groupes.find(g => g.titre === panier(due, today))!
        const projet = r.project_id ? noms.get(r.project_id as string) : null
        const details = [
          due ? jourCourt(due) : null,
          projet,
          r.status === 'in_progress' ? 'en cours' : null,
        ].filter(Boolean)

        cible.lignes.push(
          `${PRIORITE_ICONE[r.priority as string] ?? '⚪'} ${r.title}` +
            (details.length ? ` · ${details.join(' · ')}` : ''),
        )
      }

      const quoi = statut ? `tâche(s) « ${STATUT_LABEL[statut]} »` : 'tâche(s) ouverte(s)'
      return rendreGroupes(`**${rows.length} ${quoi}${portee}**`, groupes)
    },
  },

  {
    needsSession: true,
    data: new SlashCommandBuilder()
      .setName('projets')
      .setDescription('Tes projets, groupés par marque')
      .addStringOption(o =>
        o
          .setName('marque')
          .setDescription('Filtre par marque. Par défaut : celle du salon.')
          .addChoices(...MARQUE_CHOICES, { name: 'Toutes', value: 'toutes' }),
      )
      .addStringOption(o =>
        o
          .setName('statut')
          .setDescription('Par défaut : actifs')
          .addChoices(
            { name: 'Actifs', value: 'active' },
            { name: 'En pause', value: 'paused' },
            { name: 'Terminés', value: 'completed' },
            { name: 'Archivés', value: 'archived' },
          ),
      )
      .toJSON(),
    run: async (i, ctx) => {
      const statut = i.options.getString('statut') ?? 'active'
      const marqueOpt = i.options.getString('marque')
      const marque = marqueOpt === 'toutes' ? null : (marqueOpt ?? ctx.brand?.groupe ?? null)

      let query = ctx.db
        .from('projects')
        .select('id, name, groupe, priority, deadline, progress')
        .eq('status', statut)

      if (marque) query = query.ilike('groupe', marque)

      const { data, error } = await query.order('groupe').order('name')
      if (error) return `Erreur : ${error.message}`
      const rows = data ?? []
      if (rows.length === 0) return `Aucun projet ${statut === 'active' ? 'actif' : statut}.`

      const parGroupe = new Map<string, string[]>()
      for (const p of rows) {
        const g = (p.groupe as string | null) ?? 'Sans marque'
        const details = [
          p.deadline ? `échéance ${jourCourt(p.deadline as string)}` : null,
          p.progress !== null && p.progress !== undefined ? `${p.progress} %` : null,
        ].filter(Boolean)
        const ligne =
          `${PRIORITE_ICONE[p.priority as string] ?? '⚪'} ${p.name}` +
          (details.length ? ` · ${details.join(' · ')}` : '')
        parGroupe.set(g, [...(parGroupe.get(g) ?? []), ligne])
      }

      return rendreGroupes(
        `**${rows.length} projet(s)${statut === 'active' ? '' : ` — ${statut}`}**`,
        [...parGroupe.entries()].map(([titre, lignes]) => ({ titre, lignes })),
      )
    },
  },

  {
    needsSession: true,
    data: new SlashCommandBuilder()
      .setName('timer')
      .setDescription('Le chronomètre en cours, s\'il y en a un')
      .toJSON(),
    run: async (_i, ctx) => {
      const { data, error } = await ctx.db
        .from('time_entries')
        .select('description, started_at, task_id, project_id')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)

      if (error) return `Erreur : ${error.message}`
      const entry = data?.[0]
      if (!entry) return 'Aucun chronomètre en cours.'

      const ecoule = Math.floor(
        (Date.now() - new Date(entry.started_at as string).getTime()) / 1000,
      )
      const projet = entry.project_id
        ? ((await projectNames(ctx)).get(entry.project_id as string) ?? null)
        : null

      return (
        `⏱️ **${entry.description ?? 'sans titre'}** — ${formatDuration(ecoule)}\n` +
        `Depuis ${formatDateTime(entry.started_at as string, ctx.timezone)}` +
        (projet ? ` · ${projet}` : '') +
        (entry.task_id ? '' : ' · aucune tâche rattachée')
      )
    },
  },

  {
    needsSession: true,
    data: new SlashCommandBuilder()
      .setName('temps')
      .setDescription('Récapitulatif du temps suivi')
      .addIntegerOption(o =>
        o.setName('jours').setDescription('Par défaut 7').setMinValue(1).setMaxValue(90),
      )
      .toJSON(),
    run: async (i, ctx) => {
      const jours = i.options.getInteger('jours') ?? 7
      const depuis = new Date(Date.now() - jours * 86_400_000).toISOString()

      const { data, error } = await ctx.db
        .from('time_entries')
        .select('description, duration_seconds, task_id')
        .gte('started_at', depuis)
        .not('duration_seconds', 'is', null)

      if (error) return `Erreur : ${error.message}`
      const rows = data ?? []
      if (rows.length === 0) return `Aucun temps suivi depuis ${jours} jour(s).`

      const parLibelle = new Map<string, number>()
      let total = 0
      let sansTache = 0
      for (const r of rows) {
        const s = (r.duration_seconds as number | null) ?? 0
        const key = (r.description as string | null) ?? 'sans titre'
        parLibelle.set(key, (parLibelle.get(key) ?? 0) + s)
        total += s
        if (!r.task_id) sansTache += s
      }

      const detail = [...parLibelle.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([libelle, s]) => `• ${libelle} — ${formatDuration(s)}`)

      return (
        `**${formatDuration(total)} sur ${jours} jour(s)** · ${rows.length} entrée(s)` +
        (sansTache > 0 ? ` · ${formatDuration(sansTache)} hors tâche` : '') +
        `\n\n${detail.join('\n')}`
      )
    },
  },

  {
    needsSession: true,
    data: new SlashCommandBuilder()
      .setName('agenda')
      .setDescription('Les prochains événements du calendrier')
      .addIntegerOption(o =>
        o.setName('jours').setDescription('Par défaut 7').setMinValue(1).setMaxValue(60),
      )
      .toJSON(),
    run: async (i, ctx) => {
      const jours = i.options.getInteger('jours') ?? 7
      const now = new Date()
      const until = new Date(now.getTime() + jours * 86_400_000)

      const { data, error } = await ctx.db
        .from('events')
        .select('title, start_at, all_day, location')
        .gte('start_at', now.toISOString())
        .lt('start_at', until.toISOString())
        .order('start_at')

      if (error) return `Erreur : ${error.message}`
      const rows = data ?? []
      if (rows.length === 0) return `Rien au calendrier dans les ${jours} prochains jours.`

      const lignes = rows.map(e => {
        const quand = e.all_day
          ? jourCourt((e.start_at as string).slice(0, 10))
          : formatDateTime(e.start_at as string, ctx.timezone)
        return `• ${quand} — ${e.title}` + (e.location ? ` · ${e.location}` : '')
      })

      return `**${rows.length} événement(s) sur ${jours} jour(s)**\n\n${lignes.join('\n')}`
    },
  },

  {
    needsSession: true,
    data: new SlashCommandBuilder()
      .setName('inbox')
      .setDescription("Les entrées d'inbox non traitées")
      .addIntegerOption(o =>
        o.setName('limite').setDescription('Par défaut 15').setMinValue(1).setMaxValue(50),
      )
      .toJSON(),
    run: async (i, ctx) => {
      const limite = i.options.getInteger('limite') ?? 15
      const { data, error } = await ctx.db.rpc('get_work_inbox')
      if (error) return `Erreur : ${error.message}`

      const entries = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>
      if (entries.length === 0) return 'Inbox vide — rien à traiter.'

      const lignes = entries.slice(0, limite).map(e => {
        const details = [
          e.brand as string | null,
          e.expediteur as string | null,
          e.heures !== null && e.heures !== undefined ? `il y a ${e.heures} h` : null,
        ].filter(Boolean)
        return `• **${e.title ?? '(sans titre)'}**` + (details.length ? `\n  ${details.join(' · ')}` : '')
      })

      const reste = entries.length - lignes.length
      return (
        `**${entries.length} entrée(s) non traitée(s)**\n\n${lignes.join('\n')}` +
        (reste > 0 ? `\n\n… et ${reste} autre(s).` : '')
      )
    },
  },

  {
    needsSession: true,
    data: new SlashCommandBuilder()
      .setName('brief')
      .setDescription('Le dernier brief ou débrief enregistré')
      .addStringOption(o =>
        o
          .setName('type')
          .setDescription('Par défaut : le plus récent des deux')
          .addChoices(
            { name: 'Brief du matin', value: 'brief' },
            { name: 'Débrief du soir', value: 'debrief' },
          ),
      )
      .toJSON(),
    run: async (i, ctx) => {
      const kind = i.options.getString('type')
      let query = ctx.db
        .from('v_digests')
        .select('kind, content, generated_at')
        .order('generated_at', { ascending: false })
        .limit(1)

      if (kind) query = query.eq('kind', kind)

      const { data, error } = await query
      if (error) return `Erreur : ${error.message}`
      const d = data?.[0]
      if (!d) return 'Aucun brief enregistré.'

      return (
        `**${d.kind === 'brief' ? 'Brief' : 'Débrief'} du ` +
        `${formatDateTime(d.generated_at as string, ctx.timezone)}**\n\n${d.content}`
      )
    },
  },

  {
    needsSession: false,
    data: new SlashCommandBuilder()
      .setName('reset')
      .setDescription('Repart de zéro : oublie le fil de conversation de ce salon')
      .toJSON(),
    run: async (i, deps) => {
      deps.resetSession(i.channelId)
      return 'Fil de conversation réinitialisé pour ce salon.'
    },
  },

  {
    needsSession: false,
    data: new SlashCommandBuilder()
      .setName('lier')
      .setDescription('Lie ce compte Discord à Nysa')
      .addStringOption(o =>
        o.setName('email').setDescription('Adresse du compte Nysa').setRequired(true),
      )
      .toJSON(),
    run: async (i, deps) => {
      if (!deps.isAllowed(i.user.id)) {
        return (
          "Ton identifiant Discord n'est pas autorisé à lier un compte. " +
          `Ajoute \`${i.user.id}\` à AGENT_ALLOWED_DISCORD_IDS, puis relance le service.`
        )
      }
      try {
        const userId = await linkAccount(i.user.id, i.options.getString('email', true).trim())
        return `Compte lié à Nysa (\`${userId}\`). Tu peux me parler normalement.`
      } catch (e) {
        return `Liaison impossible : ${e instanceof Error ? e.message : String(e)}`
      }
    },
  },

  {
    needsSession: false,
    data: new SlashCommandBuilder()
      .setName('aide')
      .setDescription('La liste des raccourcis')
      .toJSON(),
    run: async () =>
      [
        '**Raccourcis** — réponse directe, sans passer par l’agent :',
        '`/todo` — tâches ouvertes, groupées par échéance (options : marque, quand, statut)',
        '`/projets` — projets par marque (options : marque, statut)',
        '`/timer` — chronomètre en cours',
        '`/temps` — récapitulatif du temps suivi (option : jours)',
        '`/agenda` — prochains événements (option : jours)',
        '`/inbox` — entrées non traitées',
        '`/brief` — dernier brief ou débrief',
        '`/reset` — oublier le fil de conversation du salon',
        '`/lier` — lier ce compte Discord à Nysa',
        '',
        'Pour tout le reste, écris-moi une phrase : « je commence les étiquettes »,',
        '« qu’est-ce qui est en retard chez Aeterna ? », « note la décision sur… ».',
      ].join('\n'),
  },
]

export const commandData = commands.map(c => c.data)
