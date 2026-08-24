import { z } from 'zod'
import { tool } from './types.js'

export const projectTools = [
  tool({
    name: 'lister_projets',
    description:
      "Liste les projets avec leur groupe (la marque). Sert à retrouver le nom exact d'un projet " +
      'avant de rattacher une tâche ou une entrée de temps.',
    schema: z.object({
      marque: z
        .string()
        .optional()
        .describe("'Le Mixologue', 'Aeterna', 'E-Smoker', 'Interne' ou 'Transverse'."),
      statut: z.enum(['active', 'completed', 'archived', 'paused']).default('active'),
    }),
    run: async (input, ctx) => {
      let query = ctx.db
        .from('projects')
        .select('id, name, groupe, status, priority, deadline, progress')
        .eq('status', input.statut)

      const marque = input.marque ?? ctx.brand?.groupe
      if (marque) query = query.ilike('groupe', marque)

      const { data, error } = await query.order('name')
      if (error) return `Erreur : ${error.message}`
      if (!data || data.length === 0) return 'Aucun projet ne correspond.'
      return JSON.stringify({ nombre: data.length, projets: data })
    },
  }),
]
