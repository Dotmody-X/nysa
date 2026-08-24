import { z } from 'zod'
import { tool } from './types.js'
import { audit } from '../audit.js'

/**
 * L'inbox vit dans `work.events`, un schéma que PostgREST n'expose pas.
 * On passe donc par les wrappers `public.*`, qui sont en SECURITY INVOKER :
 * la RLS `events_own` s'applique au JWT porté par l'agent.
 */
export const inboxTools = [
  tool({
    name: 'inbox',
    description:
      "Entrées non traitées de l'inbox de travail (e-mails, commandes, événements d'intégrations), " +
      "triées par urgence. C'est le point de départ du triage matinal.",
    schema: z.object({
      limite: z.number().int().min(1).max(50).default(20),
    }),
    run: async (input, ctx) => {
      const { data, error } = await ctx.db.rpc('get_work_inbox')
      if (error) return `Erreur : ${error.message}`

      const entries = Array.isArray(data) ? data : []
      if (entries.length === 0) return 'Inbox vide — rien à traiter.'

      return JSON.stringify({
        total: entries.length,
        affichees: Math.min(entries.length, input.limite),
        entrees: entries.slice(0, input.limite),
      })
    },
  }),

  tool({
    name: 'traiter_events',
    description:
      "Marque des entrées d'inbox comme traitées, pour qu'elles disparaissent du triage. " +
      "À utiliser une fois l'action correspondante décidée (tâche créée, information notée, ou sans suite).",
    schema: z.object({
      ids: z.array(z.number().int()).min(1).describe("Identifiants renvoyés par le tool `inbox`."),
    }),
    run: async (input, ctx) => {
      const { data, error } = await ctx.db.rpc('mark_work_events_processed', { p_ids: input.ids })

      await audit(ctx, {
        tool: 'traiter_events',
        args: input,
        after: { marquees: data },
        ok: !error,
        error: error?.message,
      })

      if (error) return `Erreur : ${error.message}`
      return `${data ?? 0} entrée(s) marquée(s) comme traitée(s).`
    },
  }),
]
