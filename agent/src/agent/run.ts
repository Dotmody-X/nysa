import { bridgeConfig } from '../config.js'
import { runClaude, type ClaudeRun } from '../discord/claude.js'
import { systemPrompt, type Surface } from '../discord/prompt.js'
import { brandFromChannel, type Brand } from '../brands.js'
import { mcpConfigPath } from './mcpConfig.js'
import type { Session } from '../identity.js'

type Config = ReturnType<typeof bridgeConfig>

export type RunAgentOptions = {
  config: Config
  session: Session
  prompt: string
  /** Où la réponse sera lue : ça change le ton, pas les outils. */
  surface: Surface
  /** Le salon Discord, s'il y en a un — il porte la marque implicite. */
  channelName?: string | null
  /** Marque imposée sans salon (une demande depuis l'iPad, par exemple). */
  brand?: Brand | null
  resumeSessionId: string | null
  extraDirs?: string[]
  /** Outils autorisés (voir runClaude) ; par défaut tout. */
  allowedTools?: string
  model?: string
  /** Remplace le prompt système de l'assistant — pour le triage, qui n'est pas une conversation. */
  systemPromptOverride?: string
  /** Sans le vault : un triage n'a pas à lire le Cerveau. */
  sansVault?: boolean
  /**
   * Contrôle du Mac. Réservé aux sessions où c'est Nathan lui-même qui écrit
   * dans Discord ; jamais quand le prompt contient du contenu tiers (un mail).
   */
  allowMac: boolean
}

/**
 * Un lancement de Claude Code au nom de l'utilisateur, avec les tools Nysa
 * cloisonnés par son JWT. La passerelle Discord et le worker des demandes
 * passent tous deux par ici : même prompt système, même environnement.
 */
export function runNysaAgent(o: RunAgentOptions): Promise<ClaudeRun> {
  const { config, session } = o
  const channelName = o.channelName ?? null
  const brand = o.brand ?? brandFromChannel(channelName)
  const macEnabled = o.allowMac && Boolean(config.MAC_SSH_HOST && config.MAC_SSH_USER)

  return runClaude({
    bin: config.CLAUDE_BIN,
    cwd: config.NYSA_REPO,
    prompt: o.prompt,
    timeoutMs: config.CLAUDE_TIMEOUT_MS,
    resumeSessionId: o.resumeSessionId,
    mcpConfigPath: mcpConfigPath(),
    extraDirs: [o.sansVault ? null : config.OBSIDIAN_VAULT, ...(o.extraDirs ?? [])].filter((d): d is string => Boolean(d)),
    allowedTools: o.allowedTools,
    model: o.model,
    systemPrompt: o.systemPromptOverride ?? systemPrompt({
      surface: o.surface,
      channelName,
      brand,
      timezone: config.AGENT_TIMEZONE,
      vaultPath: config.OBSIDIAN_VAULT ?? null,
      macEnabled,
    }),
    env: {
      NYSA_ACCESS_TOKEN: session.accessToken,
      NYSA_USER_ID: session.userId,
      NYSA_CHANNEL: channelName ?? '',
      NYSA_SURFACE: o.surface,
      SUPABASE_URL: config.SUPABASE_URL,
      SUPABASE_ANON_KEY: config.SUPABASE_ANON_KEY,
      AGENT_TIMEZONE: config.AGENT_TIMEZONE,
      LOG_LEVEL: config.LOG_LEVEL,
      ...(macEnabled
        ? {
            NYSA_ALLOW_MAC: '1',
            ...(config.MAC_SSH_HOST ? { MAC_SSH_HOST: config.MAC_SSH_HOST } : {}),
            ...(config.MAC_SSH_USER ? { MAC_SSH_USER: config.MAC_SSH_USER } : {}),
            ...(config.MAC_SSH_KEY ? { MAC_SSH_KEY: config.MAC_SSH_KEY } : {}),
          }
        : {}),
    },
  })
}
