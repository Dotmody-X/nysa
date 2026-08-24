import { z } from 'zod'
import { tool } from './types.js'
import { formatDateTime } from '../dates.js'

export const agendaTools = [
  tool({
    name: 'agenda',
    description:
      'Événements du calendrier sur les N prochains jours. À consulter avant de planifier quoi que ce soit.',
    schema: z.object({
      jours: z.number().int().min(1).max(60).default(7),
    }),
    run: async (input, ctx) => {
      const now = new Date()
      const until = new Date(now.getTime() + input.jours * 86_400_000)

      const { data, error } = await ctx.db
        .from('events')
        .select('id, title, start_at, end_at, all_day, category, location')
        .gte('start_at', now.toISOString())
        .lt('start_at', until.toISOString())
        .order('start_at')

      if (error) return `Erreur : ${error.message}`
      if (!data || data.length === 0) return `Aucun événement dans les ${input.jours} prochains jours.`

      return JSON.stringify({
        nombre: data.length,
        evenements: data.map(e => ({
          id: e.id,
          titre: e.title,
          debut: formatDateTime(e.start_at as string, ctx.timezone),
          journee_entiere: e.all_day,
          lieu: e.location,
        })),
      })
    },
  }),
]
