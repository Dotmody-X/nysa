import { spawn } from 'node:child_process'
import { log } from '../log.js'

export type ClaudeRun = {
  reply: string
  sessionId: string | null
}

export type ClaudeOptions = {
  bin: string
  cwd: string
  prompt: string
  timeoutMs: number
  /** Reprend la conversation du salon, pour que l'agent garde le fil. */
  resumeSessionId: string | null
  /** Injecté dans l'environnement du MCP : c'est ce qui cloisonne les données. */
  env: Record<string, string>
  mcpConfigPath: string
  systemPrompt: string
}

/**
 * Lance Claude Code en mode non interactif. L'authentification vient du compte
 * connecté sur la machine (abonnement Max) — aucune clé API, donc aucun token
 * facturé en plus de l'abonnement.
 *
 * NB : les drapeaux ci-dessous sont ceux du mode headless de Claude Code. À
 * revérifier avec `claude --help` lors de l'installation sur le Pi5, ils
 * évoluent d'une version à l'autre.
 */
export function runClaude(options: ClaudeOptions): Promise<ClaudeRun> {
  const args = [
    '-p',
    options.prompt,
    '--output-format',
    'json',
    '--mcp-config',
    options.mcpConfigPath,
    '--append-system-prompt',
    options.systemPrompt,
    // Autonomie totale sur les tools Nysa : aucune confirmation demandée.
    // La réversibilité vient du journal d'audit et de l'absence de tool de
    // suppression, pas d'un garde-fou interactif.
    '--allowedTools',
    'mcp__nysa',
  ]

  if (options.resumeSessionId) args.push('--resume', options.resumeSessionId)

  const extra = process.env.CLAUDE_EXTRA_ARGS
  if (extra) args.push(...extra.split(' ').filter(Boolean))

  return new Promise((resolve, reject) => {
    const child = spawn(options.bin, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`Claude Code n'a pas répondu en ${Math.round(options.timeoutMs / 1000)} s.`))
    }, options.timeoutMs)

    child.stdout.on('data', d => (stdout += d.toString()))
    child.stderr.on('data', d => (stderr += d.toString()))

    child.on('error', e => {
      clearTimeout(timer)
      reject(new Error(`Lancement de « ${options.bin} » impossible : ${e.message}`))
    })

    child.on('close', code => {
      clearTimeout(timer)

      if (code !== 0) {
        log.error(`Claude Code a quitté avec le code ${code}`, stderr.slice(0, 2000))
        reject(new Error(stderr.trim().split('\n').pop() || `Code de sortie ${code}`))
        return
      }

      try {
        const parsed = JSON.parse(stdout) as {
          result?: string
          session_id?: string
          is_error?: boolean
        }
        resolve({
          reply: parsed.result?.trim() || '(réponse vide)',
          sessionId: parsed.session_id ?? null,
        })
      } catch {
        // Si le format JSON change, on rend quand même quelque chose d'utile.
        resolve({ reply: stdout.trim() || '(réponse vide)', sessionId: null })
      }
    })
  })
}
