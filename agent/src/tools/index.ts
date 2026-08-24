import type { ToolDef } from './types.js'
import { taskTools } from './tasks.js'
import { projectTools } from './projects.js'
import { timeTools } from './time.js'
import { agendaTools } from './agenda.js'
import { inboxTools } from './inbox.js'
import { digestTools } from './digest.js'

/**
 * Surface complète exposée à Claude Code. Volontairement courte : au-delà d'une
 * quinzaine de tools, le choix du modèle se dégrade et les descriptions se
 * marchent dessus.
 *
 * Aucun tool de suppression : « annuler » passe par un changement de statut,
 * ce qui reste réversible — c'est ce qui rend l'autonomie totale acceptable.
 */
export const ALL_TOOLS: ToolDef[] = [
  ...taskTools,
  ...projectTools,
  ...timeTools,
  ...agendaTools,
  ...inboxTools,
  ...digestTools,
]

export type { ToolDef }
