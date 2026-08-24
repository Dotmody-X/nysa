import type { ToolDef } from './types.js'
import { taskTools } from './tasks.js'
import { projectTools } from './projects.js'
import { timeTools } from './time.js'
import { agendaTools } from './agenda.js'
import { inboxTools } from './inbox.js'
import { digestTools } from './digest.js'
import { macTools } from './mac.js'

/**
 * Surface exposée à Claude Code. Volontairement courte : au-delà d'une
 * quinzaine de tools, le choix du modèle se dégrade et les descriptions se
 * marchent dessus.
 *
 * Aucun tool de suppression : « annuler » passe par un changement de statut,
 * ce qui reste réversible — c'est ce qui rend l'autonomie totale acceptable.
 *
 * `macTools()` est un appel, pas une constante : il ne renvoie quelque chose
 * que si la session a le droit de piloter le Mac (voir `mac.ts`).
 */
export function allTools(): ToolDef[] {
  return [
    ...taskTools,
    ...projectTools,
    ...timeTools,
    ...agendaTools,
    ...inboxTools,
    ...digestTools,
    ...macTools(),
  ]
}

export type { ToolDef }
