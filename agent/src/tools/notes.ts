import { z } from 'zod'
import { tool } from './types.js'
import { audit } from '../audit.js'
import { todayISO } from '../dates.js'

/**
 * Les notes du jour — `public.notes`, une ligne par date.
 *
 * À ne pas confondre avec les briefs : un brief est un compte rendu rédigé
 * le matin ou le soir, la note du jour est le fil courant de la journée, que
 * Nathan écrit lui-même dans l'onglet Brief et que le débrief du soir relit.
 *
 * L'écriture ajoute à la suite plutôt que de remplacer : la note est partagée
 * avec ce qu'il tape dans l'interface, et l'écraser lui ferait perdre son texte.
 */
export const noteTools = [
  tool({
    name: 'lire_notes',
    description:
      "Notes du jour déjà écrites, de la plus récente à la plus ancienne. À consulter avant " +
      "d'écrire, pour ne pas répéter ce qui y est déjà, et pour savoir ce que Nathan a fait.",
    schema: z.object({
      date: z.string().optional().describe("AAAA-MM-JJ. Omis : les derniers jours."),
      limite: z.number().int().min(1).max(14).default(3),
    }),
    run: async (input, ctx) => {
      let query = ctx.db.from('notes').select('note_date, content')
      if (input.date) query = query.eq('note_date', input.date)

      const { data, error } = await query
        .order('note_date', { ascending: false })
        .limit(input.limite)

      if (error) return `Erreur : ${error.message}`
      if (!data || data.length === 0) {
        return input.date ? `Aucune note pour le ${input.date}.` : 'Aucune note enregistrée.'
      }
      return JSON.stringify(data)
    },
  }),

  tool({
    name: 'ecrire_note',
    description:
      "Écrit dans la note du jour de Nysa — l'encadré « Notes du jour » de l'onglet Brief. " +
      "C'est ici que va tout ce qu'il dit avoir fait, pensé ou remarqué dans la journée. " +
      "Ne passe PAS par `ecrire_brief` pour ça : un brief est un compte rendu du matin ou " +
      'du soir, la note est le fil courant de la journée.',
    schema: z.object({
      texte: z.string().min(1).describe('Le texte à ajouter, tel quel, sans le reformuler.'),
      date: z.string().optional().describe("AAAA-MM-JJ. Omis : aujourd'hui."),
      remplacer: z
        .boolean()
        .default(false)
        .describe(
          "Écrase la note existante. À n'utiliser que si Nathan demande explicitement de " +
            'corriger ou de réécrire : par défaut on ajoute à la suite.',
        ),
    }),
    run: async (input, ctx) => {
      const date = input.date ?? todayISO(ctx.timezone)

      const { data: existante, error: lecture } = await ctx.db
        .from('notes').select('content').eq('note_date', date).maybeSingle()
      if (lecture) return `Erreur : ${lecture.message}`

      const avant = (existante?.content ?? '').trim()
      const contenu = input.remplacer || !avant
        ? input.texte.trim()
        : `${avant}\n${input.texte.trim()}`

      const { error } = await ctx.db.from('notes').upsert(
        // user_id a pour défaut auth.uid(), mais on le pose explicitement :
        // le jeton de l'agent est celui de Nathan, autant que ce soit lisible.
        { user_id: ctx.userId, note_date: date, content: contenu, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,note_date' },
      )

      await audit(ctx, {
        tool: 'ecrire_note',
        args: input,
        before: { content: avant },
        after: { content: contenu },
        ok: !error,
        error: error?.message,
      })

      if (error) return `Erreur : ${error.message}`
      return avant && !input.remplacer
        ? `Ajouté à la note du ${date}.`
        : `Note du ${date} enregistrée.`
    },
  }),
]
