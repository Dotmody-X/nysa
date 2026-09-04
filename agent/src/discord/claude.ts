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
  /** Répertoires supplémentaires accessibles — typiquement le vault Obsidian. */
  extraDirs?: string[]
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
type SortieClaude = {
  result?: string
  session_id?: string
  is_error?: boolean
  terminal_reason?: string
}

/**
 * Le message utile est dans le JSON de stdout, pas sur stderr.
 *
 * Claude Code renseigne `result` même quand il échoue — une session OAuth
 * expirée sort ainsi avec un stderr vide et tout le diagnostic sur stdout.
 * Lire stderr en premier ne remontait donc que « Code de sortie 1 ».
 */
function messageErreur(sortie: SortieClaude | null, stderr: string, code: number | null): string {
  if (sortie?.result?.trim()) return sortie.result.trim()
  const derniere = stderr.trim().split('\n').filter(Boolean).pop()
  return derniere || `Code de sortie ${code}`
}

/**
 * Certaines pannes ont un remède connu et une seule cause plausible : autant
 * le donner dans le salon plutôt que d'obliger à ouvrir une session sur le Pi.
 */
function remede(message: string): string | null {
  if (/oauth|authenticate|credential|session expired/i.test(message)) {
    // `claude setup-token` lance sa propre procédure OAuth et ne rebranche pas
    // la session du compte Max : le service repartait en échec identique.
    return "La session Claude Code a expiré sur le Pi. Rebranche-la avec `claude auth login --claudeai`, " +
      'puis `sudo systemctl restart nysa-agent`.'
  }
  if (/usage limit|rate.?limit|quota|too many requests/i.test(message)) {
    return "Limite d'usage de l'abonnement atteinte. Elle se réinitialise seule — réessaie plus tard."
  }
  if (/ENOENT|not found/i.test(message)) {
    return 'Le binaire `claude` est introuvable à ce chemin. Vérifie `CLAUDE_BIN` dans `agent/.env`.'
  }
  return null
}

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
    // Les outils de fichiers natifs servent au vault Obsidian : c'est du
    // markdown, il n'a besoin d'aucun MCP.
    '--allowedTools',
    'mcp__nysa,Read,Write,Edit,Glob,Grep',
  ]

  for (const dir of options.extraDirs ?? []) args.push('--add-dir', dir)

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

      let sortie: SortieClaude | null = null
      try {
        sortie = JSON.parse(stdout) as SortieClaude
      } catch {
        // Le format JSON peut changer : on continue sans, stderr prendra le relais.
      }

      // Un code de sortie nul ne suffit pas : une erreur d'API ressort parfois
      // en 0, avec `is_error` pour seul signal.
      if (code !== 0 || sortie?.is_error) {
        const message = messageErreur(sortie, stderr, code)
        const aide = remede(message)
        log.error(
          `Claude Code a échoué (code ${code}${sortie?.terminal_reason ? `, ${sortie.terminal_reason}` : ''})`,
          message,
        )
        reject(new Error(aide ? `${message}\n\n${aide}` : message))
        return
      }

      if (sortie) {
        resolve({
          reply: sortie.result?.trim() || '(réponse vide)',
          sessionId: sortie.session_id ?? null,
        })
        return
      }
      resolve({ reply: stdout.trim() || '(réponse vide)', sessionId: null })
    })
  })
}
