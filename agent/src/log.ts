const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const
type Level = keyof typeof LEVELS

const configured = (process.env.LOG_LEVEL ?? 'info') as Level
const threshold = LEVELS[configured] ?? LEVELS.info

/**
 * Le serveur MCP communique avec Claude Code en JSON-RPC sur stdout : y écrire
 * un log corrompt le protocole. Tous les logs partent donc sur stderr.
 */
function emit(level: Level, message: string, extra?: unknown) {
  if (LEVELS[level] < threshold) return
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`
  if (extra === undefined) console.error(line)
  else console.error(line, extra)
}

export const log = {
  debug: (m: string, e?: unknown) => emit('debug', m, e),
  info: (m: string, e?: unknown) => emit('info', m, e),
  warn: (m: string, e?: unknown) => emit('warn', m, e),
  error: (m: string, e?: unknown) => emit('error', m, e),
}
