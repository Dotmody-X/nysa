import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  type ChatInputCommandInteraction,
  type Message,
} from 'discord.js'
import { bridgeConfig } from '../config.js'
import { linkAccount, resolveSession } from '../identity.js'
import { brandFromChannel } from '../brands.js'
import { userClient } from '../supabase.js'
import { runClaude } from './claude.js'
import { commandData, commands } from './commands.js'
import { systemPrompt } from './prompt.js'
import type { AgentContext } from '../context.js'
import { log } from '../log.js'

const config = bridgeConfig()

const here = dirname(fileURLToPath(import.meta.url))
/** Le serveur MCP compilé, lancé par Claude Code en sous-processus. */
const MCP_ENTRY = resolvePath(here, '../mcp/server.js')

/** Fil de conversation par salon, pour que l'agent garde le contexte. */
const sessions = new Map<string, string>()
/** Un seul appel à la fois par salon : les limites d'usage de l'abonnement ne sont pas infinies. */
const busy = new Set<string>()

const mcpConfigPath = (() => {
  const dir = mkdtempSync(join(tmpdir(), 'nysa-mcp-'))
  const path = join(dir, 'mcp.json')
  writeFileSync(
    path,
    JSON.stringify({
      mcpServers: {
        nysa: { command: process.execPath, args: [MCP_ENTRY] },
      },
    }),
  )
  return path
})()

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
})

function isAllowed(discordUserId: string): boolean {
  return config.AGENT_ALLOWED_DISCORD_IDS.includes(discordUserId)
}

/** Discord refuse au-delà de 2000 caractères. */
function chunk(text: string, size = 1900): string[] {
  if (text.length <= size) return [text]
  const parts: string[] = []
  let rest = text
  while (rest.length > size) {
    const cut = rest.lastIndexOf('\n', size)
    const at = cut > size * 0.5 ? cut : size
    parts.push(rest.slice(0, at))
    rest = rest.slice(at).replace(/^\n/, '')
  }
  if (rest) parts.push(rest)
  return parts
}

async function handleLink(message: Message, email: string) {
  if (!isAllowed(message.author.id)) {
    await message.reply(
      "Ton identifiant Discord n'est pas autorisé à lier un compte. " +
        `Ajoute \`${message.author.id}\` à AGENT_ALLOWED_DISCORD_IDS, puis relance le service.`,
    )
    return
  }

  try {
    const userId = await linkAccount(message.author.id, email)
    await message.reply(`Compte lié à Nysa (\`${userId}\`). Tu peux me parler normalement.`)
  } catch (e) {
    await message.reply(`Liaison impossible : ${e instanceof Error ? e.message : String(e)}`)
  }
}

async function handleAgent(message: Message, text: string) {
  const channelId = message.channelId

  if (busy.has(channelId)) {
    await message.reply('Je traite déjà une demande dans ce salon — laisse-moi finir.')
    return
  }

  let session
  try {
    session = await resolveSession(message.author.id)
  } catch (e) {
    await message.reply(`Session Nysa indisponible : ${e instanceof Error ? e.message : String(e)}`)
    return
  }

  if (!session) {
    await message.reply(
      'Ton compte Discord n\'est pas encore lié à Nysa. Envoie `!lier ton@email.com`.',
    )
    return
  }

  const channelName = channelNameOf(message)
  const brand = brandFromChannel(channelName)

  busy.add(channelId)
  if (message.channel.isSendable()) await message.channel.sendTyping()

  try {
    const run = await runClaude({
      bin: config.CLAUDE_BIN,
      cwd: config.NYSA_REPO,
      prompt: text,
      timeoutMs: config.CLAUDE_TIMEOUT_MS,
      resumeSessionId: sessions.get(channelId) ?? null,
      mcpConfigPath,
      extraDirs: config.OBSIDIAN_VAULT ? [config.OBSIDIAN_VAULT] : [],
      systemPrompt: systemPrompt({
        channelName,
        brand,
        timezone: config.AGENT_TIMEZONE,
        vaultPath: config.OBSIDIAN_VAULT ?? null,
        macEnabled: Boolean(config.MAC_SSH_HOST && config.MAC_SSH_USER),
      }),
      env: {
        NYSA_ACCESS_TOKEN: session.accessToken,
        NYSA_USER_ID: session.userId,
        NYSA_CHANNEL: channelName ?? '',
        SUPABASE_URL: config.SUPABASE_URL,
        SUPABASE_ANON_KEY: config.SUPABASE_ANON_KEY,
        AGENT_TIMEZONE: config.AGENT_TIMEZONE,
        LOG_LEVEL: config.LOG_LEVEL,

        // Séparation des contextes de confiance : le contrôle du Mac n'est
        // accordé qu'ici, où c'est l'utilisateur lui-même qui écrit. Les
        // sessions planifiées qui lisent du contenu tiers (triage d'inbox)
        // ne posent jamais ce drapeau — sans quoi un e-mail piégé
        // deviendrait une exécution de commande sur la machine principale.
        NYSA_ALLOW_MAC: '1',
        ...(config.MAC_SSH_HOST ? { MAC_SSH_HOST: config.MAC_SSH_HOST } : {}),
        ...(config.MAC_SSH_USER ? { MAC_SSH_USER: config.MAC_SSH_USER } : {}),
        ...(config.MAC_SSH_KEY ? { MAC_SSH_KEY: config.MAC_SSH_KEY } : {}),
      },
    })

    if (run.sessionId) sessions.set(channelId, run.sessionId)
    for (const part of chunk(run.reply)) await message.reply(part)
  } catch (e) {
    log.error('Échec du traitement', e)
    await message.reply(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    busy.delete(channelId)
  }
}

/** Le nom du salon porte la marque : #mixologue-contenu n'a pas à la répéter. */
function channelNameOf(source: Message | ChatInputCommandInteraction): string | null {
  const channel = source.channel
  return channel && 'name' in channel ? ((channel.name as string) ?? null) : null
}

const commandDeps = {
  resetSession: (channelId: string) => {
    sessions.delete(channelId)
  },
  isAllowed,
}

/**
 * Les raccourcis « / » répondent directement, sans lancer Claude Code : c'est une
 * lecture de la base, mise en forme. D'où ce chemin séparé de `handleAgent`, et
 * l'absence de verrou `busy` — rien ici ne consomme l'abonnement.
 */
async function handleCommand(interaction: ChatInputCommandInteraction) {
  const def = commands.find(c => c.data.name === interaction.commandName)
  if (!def) return

  // Répondre sous 3 s n'est pas garanti : on diffère d'abord.
  await interaction.deferReply()

  try {
    let reply: string

    if (def.needsSession) {
      // La liste blanche filtre avant tout accès aux données.
      if (!isAllowed(interaction.user.id)) {
        await interaction.editReply(
          `Ton identifiant Discord (\`${interaction.user.id}\`) n'est pas autorisé.`,
        )
        return
      }

      const session = await resolveSession(interaction.user.id)
      if (!session) {
        await interaction.editReply(
          "Ce compte Discord n'est pas encore lié à Nysa. Utilise `/lier`.",
        )
        return
      }

      const channelName = channelNameOf(interaction)
      const ctx: AgentContext = {
        userId: session.userId,
        db: userClient(session.accessToken),
        surface: 'discord',
        channelName,
        brand: brandFromChannel(channelName),
        timezone: config.AGENT_TIMEZONE,
      }
      reply = await def.run(interaction, ctx, commandDeps)
    } else {
      reply = await def.run(interaction, commandDeps)
    }

    const parts = chunk(reply)
    await interaction.editReply(parts[0] ?? '(vide)')
    for (const part of parts.slice(1)) await interaction.followUp(part)
  } catch (e) {
    log.error(`Raccourci /${interaction.commandName} en échec`, e)
    const message = `Erreur : ${e instanceof Error ? e.message : String(e)}`
    if (interaction.deferred || interaction.replied) await interaction.editReply(message)
  }
}

/**
 * Discord veut la liste des commandes déclarée à l'avance. On la pose sur chaque
 * serveur — propagation immédiate — ET en global, seule portée qui fonctionne en
 * message privé. Une commande de serveur masque la globale de même nom : pas de
 * doublon à l'affichage.
 */
async function registerCommands(c: Client<true>) {
  try {
    await c.application.commands.set(commandData)
    for (const guild of c.guilds.cache.values()) await guild.commands.set(commandData)
    log.info(`${commandData.length} raccourcis « / » enregistrés`)
  } catch (e) {
    log.error('Enregistrement des raccourcis impossible', e)
  }
}

client.once(Events.ClientReady, async c => {
  log.info(`Passerelle Discord connectée en tant que ${c.user.tag}`)
  log.info(`Dépôt Nysa : ${config.NYSA_REPO} — MCP : ${MCP_ENTRY}`)
  await registerCommands(c)
})

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return
  await handleCommand(interaction)
})

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return

  const content = message.content.trim()
  if (!content) return

  if (content.startsWith('!lier ')) {
    await handleLink(message, content.slice('!lier '.length).trim())
    return
  }

  if (content === '!reset') {
    sessions.delete(message.channelId)
    await message.reply('Fil de conversation réinitialisé pour ce salon.')
    return
  }

  // La liste blanche est le vrai filtre : sans elle, on ignore tout.
  if (!isAllowed(message.author.id)) return

  // En message privé, tout est pour l'agent. En salon, la mention n'est exigée
  // que si AGENT_REQUIRE_MENTION est activé — inutile sur un serveur personnel.
  const isDM = !message.guild
  const mentioned = client.user ? message.mentions.has(client.user) : false
  if (!isDM && config.AGENT_REQUIRE_MENTION && !mentioned) return

  const text = client.user
    ? content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim()
    : content

  if (text) await handleAgent(message, text)
})

client.login(config.DISCORD_TOKEN)
