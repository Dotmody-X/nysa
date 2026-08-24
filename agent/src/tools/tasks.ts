import { z } from 'zod'
import { tool } from './types.js'
import type { AgentContext } from '../context.js'
import { audit } from '../audit.js'
import { todayISO, addDaysISO } from '../dates.js'

const STATUTS = ['todo', 'in_progress', 'done', 'cancelled'] as const
const PRIORITES = ['low', 'medium', 'high', 'urgent'] as const

/** Colonnes renvoyées au modèle — inutile de lui servir la ligne entière. */
const TASK_FIELDS =
  'id, title, status, priority, due_date, planned_for, estimated_minutes, project_id, category'

type ProjectRow = { id: string; name: string; groupe: string | null }

async function findProject(ctx: AgentContext, nom?: string): Promise<ProjectRow | null> {
  if (!nom) return null
  const { data } = await ctx.db
    .from('projects')
    .select('id, name, groupe')
    .ilike('name', `%${nom}%`)
    .limit(1)
  return (data?.[0] as ProjectRow | undefined) ?? null
}

export const taskTools = [
  tool({
    name: 'lister_taches',
    description:
      "Liste les tâches. À appeler avant toute réponse sur la charge de travail, les urgences " +
      'ou le planning — ne devine jamais le contenu des tâches.',
    schema: z.object({
      statut: z
        .enum(STATUTS)
        .optional()
        .describe('Filtre par statut. Omis : todo + in_progress uniquement.'),
      marque: z
        .string()
        .optional()
        .describe("Groupe de projets : 'Le Mixologue', 'Aeterna', 'E-Smoker', 'Interne', 'Transverse'."),
      echeance_max_jours: z
        .number()
        .int()
        .optional()
        .describe("Tâches dues dans N jours (0 = aujourd'hui, négatif = en retard)."),
      limite: z.number().int().min(1).max(100).default(30),
    }),
    run: async (input, ctx) => {
      let query = ctx.db.from('tasks').select(TASK_FIELDS)

      if (input.statut) query = query.eq('status', input.statut)
      else query = query.in('status', ['todo', 'in_progress'])

      if (input.echeance_max_jours !== undefined) {
        query = query.lte('due_date', addDaysISO(todayISO(ctx.timezone), input.echeance_max_jours))
      }

      const { data, error } = await query
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(input.limite)

      if (error) return `Erreur : ${error.message}`
      let rows = data ?? []

      // Le groupe vit sur le projet : on filtre après coup plutôt que par une
      // jointure PostgREST, plus fragile que lisible ici.
      const marque = input.marque ?? ctx.brand?.groupe
      if (marque && rows.length > 0) {
        const { data: projects } = await ctx.db.from('projects').select('id').ilike('groupe', marque)
        const ids = new Set((projects ?? []).map(p => p.id as string))
        rows = rows.filter(r => r.project_id && ids.has(r.project_id as string))
      }

      if (rows.length === 0) return 'Aucune tâche ne correspond.'
      return JSON.stringify({ nombre: rows.length, taches: rows })
    },
  }),

  tool({
    name: 'creer_tache',
    description:
      "Crée une tâche. `projet` la rattache : c'est le projet qui porte la marque. " +
      "Appelle `lister_projets` d'abord si le nom exact n'est pas certain.",
    schema: z.object({
      titre: z.string().min(1),
      description: z.string().optional(),
      projet: z.string().optional().describe('Nom, même partiel, du projet à rattacher.'),
      priorite: z.enum(PRIORITES).default('medium'),
      echeance: z.string().optional().describe('AAAA-MM-JJ'),
      minutes_estimees: z.number().int().positive().optional(),
      categorie: z.string().optional(),
    }),
    run: async (input, ctx) => {
      const project = await findProject(ctx, input.projet)

      const { data, error } = await ctx.db
        .from('tasks')
        .insert({
          // user_id n'a AUCUN défaut en base : sans lui, la policy
          // WITH CHECK (auth.uid() = user_id) rejette l'insertion.
          user_id: ctx.userId,
          title: input.titre,
          description: input.description ?? null,
          project_id: project?.id ?? null,
          status: 'todo',
          priority: input.priorite,
          due_date: input.echeance ?? null,
          estimated_minutes: input.minutes_estimees ?? null,
          category: input.categorie ?? null,
        })
        .select(TASK_FIELDS)
        .single()

      await audit(ctx, { tool: 'creer_tache', args: input, after: data, ok: !error, error: error?.message })

      if (error) return `Erreur : ${error.message}`
      const rattachement = project ? `projet « ${project.name} »` : 'aucun projet'
      return `Tâche créée (${rattachement}). ${JSON.stringify(data)}`
    },
  }),

  tool({
    name: 'modifier_tache',
    description:
      'Modifie une tâche (statut, priorité, échéance, titre). Pour annuler une tâche, passe le ' +
      "statut à 'cancelled' : la suppression n'existe pas ici, et l'annulation est réversible.",
    schema: z.object({
      id: z.string().uuid(),
      statut: z.enum(STATUTS).optional(),
      priorite: z.enum(PRIORITES).optional(),
      echeance: z.string().optional().describe('AAAA-MM-JJ, ou la chaîne "null" pour retirer.'),
      titre: z.string().optional(),
      minutes_reelles: z.number().int().positive().optional(),
    }),
    run: async (input, ctx) => {
      const { data: before } = await ctx.db
        .from('tasks')
        .select(TASK_FIELDS)
        .eq('id', input.id)
        .maybeSingle()

      if (!before) return "Tâche introuvable (ou elle n'appartient pas à ce compte)."

      const patch: Record<string, unknown> = {}
      if (input.statut) {
        patch.status = input.statut
        patch.completed_at = input.statut === 'done' ? new Date().toISOString() : null
      }
      if (input.priorite) patch.priority = input.priorite
      if (input.titre) patch.title = input.titre
      if (input.minutes_reelles) patch.actual_minutes = input.minutes_reelles
      if (input.echeance !== undefined) {
        patch.due_date = input.echeance === 'null' ? null : input.echeance
      }

      if (Object.keys(patch).length === 0) return 'Rien à modifier.'

      const { data: after, error } = await ctx.db
        .from('tasks')
        .update(patch)
        .eq('id', input.id)
        .select(TASK_FIELDS)
        .single()

      await audit(ctx, {
        tool: 'modifier_tache',
        args: input,
        before,
        after,
        ok: !error,
        error: error?.message,
      })

      if (error) return `Erreur : ${error.message}`
      return `Tâche mise à jour. ${JSON.stringify(after)}`
    },
  }),
]
