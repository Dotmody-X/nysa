import { z } from 'zod'
import { tool } from './types.js'
import type { AgentContext } from '../context.js'
import { audit } from '../audit.js'
import { formatDuration, localToISO, todayISO } from '../dates.js'

const ENTRY_FIELDS = 'id, description, category, project_id, task_id, started_at, ended_at, duration_seconds'
const TASK_FIELDS = 'id, title, status, priority, due_date, actual_minutes, project_id'

type Task = {
  id: string
  title: string
  status: string
  due_date: string | null
  actual_minutes: number | null
  project_id: string | null
}

/**
 * Au-delà de cette durée, un chronomètre encore ouvert n'est pas du travail en
 * cours : c'est un pointage oublié. Le compter produirait des totaux absurdes
 * — un oubli d'une semaine s'est déjà traduit par 415 h attribuées à une seule
 * tâche. On le ferme sans durée plutôt que de polluer les statistiques.
 */
const CHRONO_ABANDONNE_S = 12 * 3600

/**
 * Ferme le chronomètre en cours et applique la règle de statut à la tâche
 * qu'on quitte :
 *   - terminée      -> `done`
 *   - non terminée  -> `in_progress`, ÉCHÉANCE INCHANGÉE, donc toujours visible
 *
 * Le temps écoulé est cumulé dans `actual_minutes` : c'est ce qui permet de
 * comparer estimé et réel sans ressaisie.
 */
async function closeRunning(
  ctx: AgentContext,
  terminee: boolean,
): Promise<{ resume: string | null; seconds: number }> {
  const { data: running } = await ctx.db
    .from('time_entries')
    .select(ENTRY_FIELDS)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)

  const current = running?.[0]
  if (!current) return { resume: null, seconds: 0 }

  const ecoule = Math.max(
    0,
    Math.floor((Date.now() - new Date(current.started_at as string).getTime()) / 1000),
  )
  const abandonne = ecoule > CHRONO_ABANDONNE_S
  const seconds = abandonne ? 0 : ecoule

  await ctx.db
    .from('time_entries')
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: abandonne ? null : seconds,
    })
    .eq('id', current.id as string)

  if (abandonne) {
    await audit(ctx, {
      tool: 'chrono_abandonne',
      args: { id: current.id, heures_ecoulees: Math.round(ecoule / 360) / 10 },
      before: current,
    })
    return {
      resume:
        `Chronomètre oublié depuis ${Math.round(ecoule / 3600)} h ` +
        `(« ${current.description ?? 'sans titre'} ») fermé sans durée — il aurait faussé tes totaux`,
      seconds: 0,
    }
  }

  let suffixe = ''

  if (current.task_id) {
    const { data: before } = await ctx.db
      .from('tasks')
      .select(TASK_FIELDS)
      .eq('id', current.task_id as string)
      .maybeSingle()

    if (before) {
      const task = before as unknown as Task
      const cumul = (task.actual_minutes ?? 0) + Math.round(seconds / 60)

      const patch: Record<string, unknown> = { actual_minutes: cumul }
      if (terminee) {
        patch.status = 'done'
        patch.completed_at = new Date().toISOString()
      } else if (task.status !== 'done') {
        // On ne touche NI à due_date NI à planned_for : la tâche doit rester
        // visible sur la même échéance.
        patch.status = 'in_progress'
      }

      const { data: after } = await ctx.db
        .from('tasks')
        .update(patch)
        .eq('id', task.id)
        .select(TASK_FIELDS)
        .single()

      await audit(ctx, {
        tool: 'cloture_tache_sur_changement',
        args: { task_id: task.id, terminee, secondes: seconds },
        before,
        after,
      })

      suffixe = terminee
        ? ` — « ${task.title} » cochée`
        : ` — « ${task.title} » en cours, échéance inchangée`
    }
  }

  return {
    resume: `« ${current.description ?? 'sans titre'} » arrêté à ${formatDuration(seconds)}${suffixe}`,
    seconds,
  }
}

async function findTask(ctx: AgentContext, texte: string): Promise<Task | null> {
  const { data } = await ctx.db
    .from('tasks')
    .select(TASK_FIELDS)
    .in('status', ['todo', 'in_progress'])
    .ilike('title', `%${texte}%`)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(1)
  return (data?.[0] as unknown as Task | undefined) ?? null
}

async function findProjectId(ctx: AgentContext, nom?: string): Promise<string | null> {
  if (!nom) return null
  const { data } = await ctx.db.from('projects').select('id').ilike('name', `%${nom}%`).limit(1)
  return (data?.[0]?.id as string | undefined) ?? null
}

export const timeTools = [
  tool({
    name: 'timer_en_cours',
    description: "Chronomètre en cours et tâche associée, s'il y en a un.",
    schema: z.object({}),
    run: async (_input, ctx) => {
      const { data, error } = await ctx.db
        .from('time_entries')
        .select(ENTRY_FIELDS)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)

      if (error) return `Erreur : ${error.message}`
      const entry = data?.[0]
      if (!entry) return 'Aucun chronomètre en cours.'

      const elapsed = Math.floor((Date.now() - new Date(entry.started_at as string).getTime()) / 1000)
      return JSON.stringify({ ...entry, ecoule: formatDuration(elapsed) })
    },
  }),

  tool({
    name: 'chercher_tache',
    description:
      "Cherche une tâche ouverte par son intitulé. À utiliser quand l'utilisateur mentionne un " +
      'travail sans donner de référence précise.',
    schema: z.object({
      texte: z.string().min(2),
    }),
    run: async (input, ctx) => {
      const { data, error } = await ctx.db
        .from('tasks')
        .select(TASK_FIELDS)
        .in('status', ['todo', 'in_progress'])
        .ilike('title', `%${input.texte}%`)
        .limit(5)

      if (error) return `Erreur : ${error.message}`
      if (!data || data.length === 0) return 'Aucune tâche ouverte ne correspond.'
      return JSON.stringify(data)
    },
  }),

  tool({
    name: 'demarrer_activite',
    description:
      "LE tool à utiliser quand l'utilisateur annonce ce qu'il commence (« je commence X », " +
      '« je passe sur Y », « j\'attaque Z »). Il enchaîne tout : il arrête le chronomètre en cours, ' +
      'applique le bon statut à la tâche quittée, retrouve ou crée la tâche cible, et démarre le ' +
      'nouveau chronomètre lié à la tâche et au projet.\n\n' +
      'Renseigne `precedente_terminee` seulement si l\'utilisateur a dit que ce qu\'il quittait est ' +
      "fini. Dans le doute, laisse false : la tâche restera visible sur la même échéance.\n\n" +
      "Ne crée un projet que si l'utilisateur le demande explicitement — c'est un cas rare.",
    schema: z.object({
      quoi: z.string().min(2).describe("Ce que l'utilisateur commence, dans ses mots."),
      tache_id: z
        .string()
        .uuid()
        .optional()
        .describe('Si tu as déjà identifié la tâche via `chercher_tache`.'),
      projet: z.string().optional().describe('Nom, même partiel, du projet de rattachement.'),
      precedente_terminee: z
        .boolean()
        .default(false)
        .describe("La tâche qu'on quitte est-elle terminée ?"),
      creer_tache_si_absente: z
        .boolean()
        .default(true)
        .describe('Crée la tâche si aucune ne correspond.'),
    }),
    run: async (input, ctx) => {
      const closed = await closeRunning(ctx, input.precedente_terminee)

      let task: Task | null = null
      if (input.tache_id) {
        const { data } = await ctx.db
          .from('tasks')
          .select(TASK_FIELDS)
          .eq('id', input.tache_id)
          .maybeSingle()
        task = (data as unknown as Task | null) ?? null
      }
      if (!task) task = await findTask(ctx, input.quoi)

      let creee = false
      if (!task && input.creer_tache_si_absente) {
        const projectId = await findProjectId(ctx, input.projet ?? undefined)
        const { data, error } = await ctx.db
          .from('tasks')
          .insert({
            user_id: ctx.userId,
            title: input.quoi,
            status: 'in_progress',
            priority: 'medium',
            project_id: projectId,
          })
          .select(TASK_FIELDS)
          .single()

        if (error) return `Erreur à la création de la tâche : ${error.message}`
        task = data as unknown as Task
        creee = true
        await audit(ctx, { tool: 'demarrer_activite/creation', args: input, after: data })
      }

      // La tâche reprise repasse en cours si elle ne l'était pas.
      if (task && !creee && task.status !== 'in_progress') {
        await ctx.db.from('tasks').update({ status: 'in_progress' }).eq('id', task.id)
      }

      const projectId = task?.project_id ?? (await findProjectId(ctx, input.projet ?? undefined))

      const { data: entry, error } = await ctx.db
        .from('time_entries')
        .insert({
          // user_id n'a AUCUN défaut en base : sans lui, la policy
          // WITH CHECK (auth.uid() = user_id) rejette l'insertion.
          user_id: ctx.userId,
          description: task?.title ?? input.quoi,
          project_id: projectId,
          task_id: task?.id ?? null,
          started_at: new Date().toISOString(),
        })
        .select(ENTRY_FIELDS)
        .single()

      await audit(ctx, {
        tool: 'demarrer_activite',
        args: input,
        before: closed.resume ? { arrete: closed.resume } : null,
        after: entry,
        ok: !error,
        error: error?.message,
      })

      if (error) return `Erreur au démarrage du chronomètre : ${error.message}`

      const lignes: string[] = []
      if (closed.resume) lignes.push(closed.resume)
      lignes.push(
        `Chronomètre lancé sur « ${task?.title ?? input.quoi} »` +
          (creee ? ' (tâche créée)' : task ? ' (tâche existante)' : ' (sans tâche)') +
          (projectId ? '' : ', aucun projet rattaché'),
      )
      return lignes.join('\n')
    },
  }),

  tool({
    name: 'arreter_activite',
    description:
      "Arrête le chronomètre sans en démarrer un autre — fin de journée, pause. Applique la même " +
      'règle de statut que `demarrer_activite` à la tâche en cours.',
    schema: z.object({
      terminee: z.boolean().default(false).describe('La tâche en cours est-elle terminée ?'),
    }),
    run: async (input, ctx) => {
      const closed = await closeRunning(ctx, input.terminee)
      if (!closed.resume) return 'Aucun chronomètre en cours.'
      return closed.resume
    },
  }),

  tool({
    name: 'saisir_temps',
    description:
      "Enregistre un bloc de temps DÉJÀ passé, avec ses heures de début et de fin. C'est le tool à " +
      "utiliser quand l'utilisateur raconte sa journée après coup (« de 8h à 9h j'ai fait X, puis " +
      "jusqu'à 13h50 j'ai fait Y »). `demarrer_activite`, lui, ne sert qu'à pointer en direct.\n\n" +
      'Appelle-le une fois par bloc. Les heures sont en heure locale, format 24 h.',
    schema: z.object({
      description: z.string().min(2).describe("Ce qui a été fait pendant ce bloc."),
      debut: z.string().describe('Heure de début, format HH:MM (ex. 08:00).'),
      fin: z.string().describe('Heure de fin, format HH:MM (ex. 09:00).'),
      date: z.string().optional().describe("Date AAAA-MM-JJ. Par défaut aujourd'hui."),
      projet: z.string().optional().describe('Nom, même partiel, du projet.'),
      tache_id: z.string().uuid().optional().describe('Tâche à créditer du temps.'),
    }),
    run: async (input, ctx) => {
      const jour = input.date ?? todayISO(ctx.timezone)

      let debut: string
      let fin: string
      try {
        debut = localToISO(jour, input.debut, ctx.timezone)
        fin = localToISO(jour, input.fin, ctx.timezone)
      } catch (e) {
        return e instanceof Error ? e.message : String(e)
      }

      let seconds = Math.floor((new Date(fin).getTime() - new Date(debut).getTime()) / 1000)
      // Un bloc qui se termine « avant » son début a franchi minuit.
      if (seconds < 0) {
        fin = new Date(new Date(fin).getTime() + 86_400_000).toISOString()
        seconds += 86_400
      }
      if (seconds <= 0) return 'Le bloc a une durée nulle.'
      if (seconds > CHRONO_ABANDONNE_S) {
        return `Bloc de ${formatDuration(seconds)} : c'est plus de 12 h d'affilée, vérifie les heures.`
      }

      const projectId = await findProjectId(ctx, input.projet ?? undefined)

      const { data, error } = await ctx.db
        .from('time_entries')
        .insert({
          user_id: ctx.userId,
          description: input.description,
          project_id: projectId,
          task_id: input.tache_id ?? null,
          started_at: debut,
          ended_at: fin,
          duration_seconds: seconds,
        })
        .select(ENTRY_FIELDS)
        .single()

      // Le temps doit aussi remonter sur la tâche, sinon estimé et réel divergent.
      if (!error && input.tache_id) {
        const { data: t } = await ctx.db
          .from('tasks')
          .select('actual_minutes')
          .eq('id', input.tache_id)
          .maybeSingle()
        if (t) {
          await ctx.db
            .from('tasks')
            .update({
              actual_minutes: ((t.actual_minutes as number | null) ?? 0) + Math.round(seconds / 60),
            })
            .eq('id', input.tache_id)
        }
      }

      await audit(ctx, {
        tool: 'saisir_temps',
        args: input,
        after: data,
        ok: !error,
        error: error?.message,
      })

      if (error) return `Erreur : ${error.message}`
      return `Enregistré : « ${input.description} », ${input.debut}–${input.fin} (${formatDuration(seconds)}).`
    },
  }),

  tool({
    name: 'temps_recent',
    description:
      'Totaux de temps suivi sur les N derniers jours, agrégés par intitulé. Sert aux bilans et à ' +
      'repérer les trous de pointage.',
    schema: z.object({
      jours: z.number().int().min(1).max(90).default(7),
    }),
    run: async (input, ctx) => {
      const since = new Date(Date.now() - input.jours * 86_400_000).toISOString()

      const { data, error } = await ctx.db
        .from('time_entries')
        .select('description, duration_seconds, started_at, project_id, task_id')
        .gte('started_at', since)
        .not('duration_seconds', 'is', null)

      if (error) return `Erreur : ${error.message}`
      const rows = data ?? []
      if (rows.length === 0) return `Aucun temps suivi depuis ${input.jours} jours.`

      const parLibelle = new Map<string, number>()
      let total = 0
      let sansTache = 0
      for (const r of rows) {
        const key = (r.description as string | null) ?? 'sans titre'
        const s = (r.duration_seconds as number | null) ?? 0
        parLibelle.set(key, (parLibelle.get(key) ?? 0) + s)
        total += s
        if (!r.task_id) sansTache += s
      }

      return JSON.stringify({
        jours: input.jours,
        total: formatDuration(total),
        entrees: rows.length,
        non_rattache_a_une_tache: formatDuration(sansTache),
        detail: [...parLibelle.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([libelle, s]) => ({ libelle, duree: formatDuration(s) })),
      })
    },
  }),
]
