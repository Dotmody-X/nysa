import { z } from 'zod'
import { tool } from './types.js'
import { audit } from '../audit.js'
import { formatDuration, todayISO } from '../dates.js'

const ENTRY_FIELDS = 'id, description, category, project_id, started_at, ended_at, duration_seconds'

export const timeTools = [
  tool({
    name: 'timer_en_cours',
    description:
      "Renvoie le chronomètre en cours, s'il y en a un. À vérifier avant d'en démarrer un autre.",
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
    name: 'demarrer_timer',
    description:
      "Démarre un chronomètre. S'il en existe déjà un ouvert, il est arrêté automatiquement — " +
      'on ne peut pas suivre deux activités à la fois.',
    schema: z.object({
      description: z.string().min(1).describe('Ce sur quoi tu travailles, en langage naturel.'),
      projet: z.string().optional().describe('Nom, même partiel, du projet.'),
      categorie: z.string().optional(),
    }),
    run: async (input, ctx) => {
      let closed: string | null = null

      const { data: running } = await ctx.db
        .from('time_entries')
        .select('id, started_at, description')
        .is('ended_at', null)
        .limit(1)

      const current = running?.[0]
      if (current) {
        const startedAt = new Date(current.started_at as string)
        const seconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000))
        await ctx.db
          .from('time_entries')
          .update({ ended_at: new Date().toISOString(), duration_seconds: seconds })
          .eq('id', current.id as string)
        closed = `Chronomètre précédent (« ${current.description ?? 'sans titre'} ») arrêté à ${formatDuration(seconds)}. `
      }

      let projectId: string | null = null
      if (input.projet) {
        const { data: p } = await ctx.db
          .from('projects')
          .select('id')
          .ilike('name', `%${input.projet}%`)
          .limit(1)
        projectId = (p?.[0]?.id as string | undefined) ?? null
      }

      const { data, error } = await ctx.db
        .from('time_entries')
        .insert({
          description: input.description,
          category: input.categorie ?? null,
          project_id: projectId,
          started_at: new Date().toISOString(),
        })
        .select(ENTRY_FIELDS)
        .single()

      await audit(ctx, {
        tool: 'demarrer_timer',
        args: input,
        after: data,
        ok: !error,
        error: error?.message,
      })

      if (error) return `Erreur : ${error.message}`
      return `${closed ?? ''}Chronomètre démarré : « ${input.description} ».`
    },
  }),

  tool({
    name: 'arreter_timer',
    description: 'Arrête le chronomètre en cours et calcule sa durée.',
    schema: z.object({}),
    run: async (_input, ctx) => {
      const { data: running } = await ctx.db
        .from('time_entries')
        .select('id, started_at, description')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)

      const current = running?.[0]
      if (!current) return 'Aucun chronomètre en cours.'

      const seconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(current.started_at as string).getTime()) / 1000),
      )

      const { data, error } = await ctx.db
        .from('time_entries')
        .update({ ended_at: new Date().toISOString(), duration_seconds: seconds })
        .eq('id', current.id as string)
        .select(ENTRY_FIELDS)
        .single()

      await audit(ctx, {
        tool: 'arreter_timer',
        args: {},
        before: current,
        after: data,
        ok: !error,
        error: error?.message,
      })

      if (error) return `Erreur : ${error.message}`
      return `Arrêté : « ${current.description ?? 'sans titre'} », ${formatDuration(seconds)}.`
    },
  }),

  tool({
    name: 'temps_recent',
    description:
      "Totaux de temps suivi sur les N derniers jours, agrégés par description. Sert aux bilans " +
      'et à repérer les trous de pointage.',
    schema: z.object({
      jours: z.number().int().min(1).max(90).default(7),
    }),
    run: async (input, ctx) => {
      const since = new Date(Date.now() - input.jours * 86_400_000).toISOString()

      const { data, error } = await ctx.db
        .from('time_entries')
        .select('description, duration_seconds, started_at, project_id')
        .gte('started_at', since)
        .not('duration_seconds', 'is', null)

      if (error) return `Erreur : ${error.message}`
      const rows = data ?? []
      if (rows.length === 0) return `Aucun temps suivi depuis ${input.jours} jours.`

      const parLibelle = new Map<string, number>()
      let total = 0
      for (const r of rows) {
        const key = (r.description as string | null) ?? 'sans titre'
        const s = (r.duration_seconds as number | null) ?? 0
        parLibelle.set(key, (parLibelle.get(key) ?? 0) + s)
        total += s
      }

      const detail = [...parLibelle.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([libelle, s]) => ({ libelle, duree: formatDuration(s) }))

      return JSON.stringify({
        depuis: todayISO(ctx.timezone),
        jours: input.jours,
        total: formatDuration(total),
        entrees: rows.length,
        detail,
      })
    },
  }),
]
