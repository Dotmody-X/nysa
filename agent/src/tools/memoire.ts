import { z } from 'zod'
import { tool } from './types.js'
import { audit } from '../audit.js'
import { retenir } from '../memoire.js'

/**
 * Un seul tool pour apprendre : une correction (« non, c'est Le Mixologue »)
 * ou une chose que Nathan dit explicitement (« quand je dis BAT, c'est le projet
 * impression »). La règle est active tout de suite, et la correction brute est
 * gardée dans public.erreurs — c'est la matière de l'apprentissage de nuit.
 * Retirer une règle se fait dans l'app (« Ce que Nysa a appris »), pas ici.
 */
export const memoireTools = [
  tool({
    name: 'apprendre',
    description:
      "Retiens une règle que Nathan vient de t'apprendre. À appeler AUSSITÔT qu'il te corrige " +
      "(« non, c'est X ») ou qu'il te dit comment il nomme une chose, et quand il répond à une question " +
      "que t'a fait poser un projet incertain. Exemple : cle « mixo », valeur « Le Mixologue ». La règle " +
      'sert dès la demande suivante, sans redemander.',
    schema: z.object({
      cle: z.string().min(1).describe('Ce que Nathan dit : le surnom, le mot, tel quel (« mixo », « BAT »).'),
      valeur: z
        .string()
        .min(1)
        .describe("Ce que ça veut dire : le nom exact du projet ou de la marque, ou la règle en clair."),
      type: z
        .enum(['alias', 'regle', 'preference'])
        .default('alias')
        .describe('alias : un nom pour un autre (le cas courant). regle : « BAT → projet impression ». preference : une habitude.'),
      origine: z
        .enum(['correction', 'explicite'])
        .default('correction')
        .describe(
          "correction : il t'a corrigé, OU il a répondu à une question que tu as dû lui poser parce que tu " +
            "ne savais pas (projet incertain, mot inconnu) — c'est le cas le plus courant. explicite : il te " +
            "l'a dit de lui-même, sans que tu aies hésité ni que tu te sois trompé.",
        ),
      demande: z.string().optional().describe("Sa phrase d'origine, telle quelle."),
      compris: z.string().optional().describe("Ce que tu avais compris (ou « je n'ai pas su »)."),
    }),
    run: async (input, ctx) => {
      const regle = await retenir(ctx, {
        type: input.type,
        cle: input.cle,
        valeur: input.valeur,
        origine: input.origine,
        exemple: input.demande ?? null,
      })
      if (input.origine === 'correction') {
        await ctx.db.from('erreurs').insert({
          user_id: ctx.userId,
          demande: input.demande ?? input.cle,
          compris: input.compris ?? null,
          voulu: input.valeur,
          memoire_id: regle.id,
          surface: ctx.surface,
          canal: ctx.channelName,
        })
      }
      await audit(ctx, { tool: 'apprendre', args: input, after: regle })
      const cible = regle.cible_projet ? ' (projet reconnu)' : regle.cible_groupe ? ` (marque ${regle.cible_groupe})` : ''
      return `Retenu : « ${regle.cle} » → ${regle.valeur}${cible}. Active dès maintenant.`
    },
  }),
]
