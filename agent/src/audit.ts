import type { AgentContext } from './context.js'
import { log } from './log.js'

type AuditEntry = {
  tool: string
  args: unknown
  before?: unknown
  after?: unknown
  ok?: boolean
  error?: string
}

/**
 * L'agent écrit sans demander confirmation. Le journal est donc le filet :
 * chaque modification conserve son état avant/après, ce qui rend n'importe
 * quelle erreur rattrapable a posteriori.
 *
 * L'écriture du journal ne doit jamais faire échouer l'action elle-même.
 */
export async function audit(ctx: AgentContext, entry: AuditEntry): Promise<void> {
  try {
    const { error } = await ctx.db.from('agent_audit_log').insert({
      user_id: ctx.userId,
      surface: ctx.surface,
      channel: ctx.channelName,
      tool: entry.tool,
      args: entry.args ?? {},
      before: entry.before ?? null,
      after: entry.after ?? null,
      ok: entry.ok ?? true,
      error: entry.error ?? null,
    })
    if (error) log.warn(`Journal d'audit non écrit (${entry.tool}) : ${error.message}`)
  } catch (e) {
    log.warn(`Journal d'audit non écrit (${entry.tool})`, e)
  }
}
