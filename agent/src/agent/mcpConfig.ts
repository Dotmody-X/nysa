import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
/** Le serveur MCP compilé, lancé par Claude Code en sous-processus. */
export const MCP_ENTRY = resolvePath(here, '../mcp/server.js')

let chemin: string | null = null

/**
 * Le fichier de configuration MCP que Claude Code lit à chaque lancement.
 * Écrit une fois par processus, dans un répertoire temporaire privé : la
 * passerelle Discord et le worker des demandes partagent le même.
 */
export function mcpConfigPath(): string {
  if (chemin) return chemin
  const dir = mkdtempSync(join(tmpdir(), 'nysa-mcp-'))
  chemin = join(dir, 'mcp.json')
  writeFileSync(
    chemin,
    JSON.stringify({
      mcpServers: {
        nysa: { command: process.execPath, args: [MCP_ENTRY] },
      },
    }),
  )
  return chemin
}
