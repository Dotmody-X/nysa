import { z } from 'zod'
import { tool } from './types.js'
import { audit } from '../audit.js'
import { formatDateTime } from '../dates.js'

export const digestTools = [
  tool({
    name: 'lire_briefs',
    description:
      'Briefs du matin et débriefs du soir déjà écrits, du plus récent au plus ancien. ' +
      'À consulter avant de rédiger un nouveau brief, pour la continuité.',
    schema: z.object({
      kind: z.enum(['brief', 'debrief']).optional(),
      limite: z.number().int().min(1).max(10).default(3),
    }),
    run: async (input, ctx) => {
      let query = ctx.db
        .from('v_digests')
        .select('id, kind, content, generated_at')
        .order('generated_at', { ascending: false })
        .limit(input.limite)

      if (input.kind) query = query.eq('kind', input.kind)

      const { data, error } = await query
      if (error) return `Erreur : ${error.message}`
      if (!data || data.length === 0) return 'Aucun brief enregistré.'

      return JSON.stringify(
        data.map(d => ({
          kind: d.kind,
          le: formatDateTime(d.generated_at as string, ctx.timezone),
          contenu: d.content,
        })),
      )
    },
  }),

  tool({
    name: 'ecrire_brief',
    description:
      "Enregistre un brief (matin) ou un débriefe (soir) dans Nysa, pour qu'il reste consultable " +
      "depuis l'application web et serve de mémoire au prochain brief. Écris-le en français, " +
      'structuré et court : priorités du jour, échéances, points de vigilance.',
    schema: z.object({
      kind: z.enum(['brief', 'debrief']),
      contenu: z.string().min(1),
    }),
    run: async (input, ctx) => {
      const { data, error } = await ctx.db.rpc('write_work_digest', {
        p_kind: input.kind,
        p_content: input.contenu,
      })

      await audit(ctx, {
        tool: 'ecrire_brief',
        args: { kind: input.kind, longueur: input.contenu.length },
        after: { id: data },
        ok: !error,
        error: error?.message,
      })

      if (error) return `Erreur : ${error.message}`
      return `${input.kind === 'brief' ? 'Brief' : 'Débrief'} enregistré (id ${data}).`
    },
  }),
]
