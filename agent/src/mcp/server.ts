import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { mcpConfig } from '../config.js'
import { userClient } from '../supabase.js'
import { brandFromChannel } from '../brands.js'
import { allTools } from '../tools/index.js'
import type { AgentContext } from '../context.js'
import { log } from '../log.js'

/**
 * Serveur MCP « Nysa ». Lancé en sous-processus par Claude Code, il lui donne
 * accès aux données de travail — et à rien d'autre.
 *
 * Le point clé : il porte le JWT de l'utilisateur, injecté par la passerelle
 * Discord dans NYSA_ACCESS_TOKEN. Toutes les requêtes passent donc par la RLS,
 * contrairement au MCP Supabase officiel qui s'authentifie avec un jeton
 * d'accès total au projet et court-circuite les policies.
 */
async function main() {
  const config = mcpConfig()

  const accessToken = process.env.NYSA_ACCESS_TOKEN
  const userId = process.env.NYSA_USER_ID

  if (!accessToken || !userId) {
    console.error(
      'NYSA_ACCESS_TOKEN et NYSA_USER_ID sont requis : ce serveur doit être lancé par la passerelle, ' +
        'qui résout la session Supabase avant de démarrer Claude Code.',
    )
    process.exit(1)
  }

  const channelName = process.env.NYSA_CHANNEL ?? null

  const ctx: AgentContext = {
    userId,
    db: userClient(accessToken),
    surface: 'discord',
    channelName,
    brand: brandFromChannel(channelName),
    timezone: config.AGENT_TIMEZONE,
  }

  const server = new McpServer({ name: 'nysa', version: '0.1.0' })
  const tools = allTools()

  for (const def of tools) {
    server.tool(def.name, def.description, def.schema.shape, async (input: unknown) => {
      try {
        const text = await def.run(input, ctx)
        return { content: [{ type: 'text' as const, text }] }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        log.error(`Tool ${def.name} en échec : ${message}`)
        return {
          content: [{ type: 'text' as const, text: `Erreur dans ${def.name} : ${message}` }],
          isError: true,
        }
      }
    })
  }

  log.info(
    `MCP Nysa prêt — ${tools.length} tools, utilisateur ${userId}` +
      (ctx.brand ? `, marque ${ctx.brand.groupe}` : '') +
      (process.env.NYSA_ALLOW_MAC === '1' ? ', contrôle Mac ACTIF' : ''),
  )

  await server.connect(new StdioServerTransport())
}

main().catch(e => {
  log.error('Démarrage du serveur MCP impossible', e)
  process.exit(1)
})
