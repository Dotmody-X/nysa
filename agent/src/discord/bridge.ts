import { mkdtempSync, rmSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
import { runNysaAgent } from '../agent/run.js'
import { MCP_ENTRY } from '../agent/mcpConfig.js'
import { startRequestWorker } from '../requests/worker.js'
import { startTriageWorker } from '../triage/worker.js'
import { commandData, commands } from './commands.js'
import type { AgentContext } from '../context.js'
import { log } from '../log.js'

const config = bridgeConfig()

/** Fil de conversation par salon, pour que l'agent garde le contexte. */
const sessions = new Map<string, string>()
/** Un seul appel à la fois par salon : les limites d'usage de l'abonnement ne sont pas infinies. */
const busy = new Set<string>()

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

/**
 * Les pièces jointes Discord vivent sur un CDN, pas dans le message : Claude
 * ne les verrait jamais. On les dépose sur le disque le temps de la
 * conversation, et le prompt dit où. Le répertoire est ajouté aux dossiers
 * autorisés pour que `Read` puisse ouvrir un PDF, et
 * `joindre_document_etiquette` les envoie dans le bucket depuis ce chemin.
 */
async function deposerPiecesJointes(message: Message): Promise<{ dossier: string | null; lignes: string[] }> {
  if (message.attachments.size === 0) return { dossier: null, lignes: [] }
  const dossier = mkdtempSync(join(tmpdir(), 'nysa-pj-'))
  const lignes: string[] = []
  for (const pj of message.attachments.values()) {
    const nom = (pj.name ?? 'fichier').replace(/[^\w.\-]/g, '_')
    const chemin = join(dossier, nom)
    try {
      const rep = await fetch(pj.url)
      if (!rep.ok) throw new Error(`HTTP ${rep.status}`)
      await writeFile(chemin, Buffer.from(await rep.arrayBuffer()))
      lignes.push(`- ${chemin} (${pj.contentType ?? 'type inconnu'}, ${Math.round(pj.size / 1024)} ko)`)
    } catch (e) {
      log.warn(`Pièce jointe ${pj.name} non récupérée`, e)
      lignes.push(`- ${pj.name} : téléchargement impossible`)
    }
  }
  return { dossier, lignes }
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

  busy.add(channelId)
  if (message.channel.isSendable()) await message.channel.sendTyping()

  const pieces = await deposerPiecesJointes(message)
  const prompt = pieces.lignes.length
    ? `${text || '(message sans texte, seulement des pièces jointes)'}\n\nPièces jointes déposées sur le disque :\n${pieces.lignes.join('\n')}`
    : text

  try {
    const run = await runNysaAgent({
      config,
      session,
      prompt,
      surface: 'discord',
      channelName,
      resumeSessionId: sessions.get(channelId) ?? null,
      extraDirs: pieces.dossier ? [pieces.dossier] : [],
      // Ici c'est Nathan lui-même qui écrit : le contrôle du Mac est permis.
      allowMac: true,
    })

    if (run.sessionId) sessions.set(channelId, run.sessionId)
    for (const part of chunk(run.reply)) await message.reply(part)
  } catch (e) {
    log.error('Échec du traitement', e)
    await message.reply(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    busy.delete(channelId)
    // Les fichiers ne restent que le temps de la réponse : ils sont déjà dans le bucket s'ils devaient y aller.
    if (pieces.dossier) rmSync(pieces.dossier, { recursive: true, force: true })
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
    // Enregistrement par serveur UNIQUEMENT. Le faire aussi globalement
    // ferait coexister deux jeux identiques : Discord les affiche tous les
    // deux et chaque raccourci apparait en double. Le mode serveur se propage
    // en outre immediatement, la ou le global met jusqu a une heure.
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
  // Les demandes déposées depuis l'application (l'iPad) : même processus, même session.
  startRequestWorker(config)
  // Chaque mail déposé par nysa-mail passe par Claude : résumé, catégorie, urgence.
  startTriageWorker(config)
})

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return
  await handleCommand(interaction)
})

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return

  const content = message.content.trim()
  if (!content && message.attachments.size === 0) return

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

  if (text || message.attachments.size > 0) await handleAgent(message, text)
})

client.login(config.DISCORD_TOKEN)
