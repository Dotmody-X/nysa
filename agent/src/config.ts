import 'dotenv/config'
import { z } from 'zod'

/**
 * Deux processus partagent ce fichier :
 *   - la passerelle Discord (`src/discord/bridge.ts`), qui a besoin de tout ;
 *   - le serveur MCP (`src/mcp/server.ts`), lancé par Claude Code, qui n'a
 *     besoin que de Supabase et du jeton d'accès injecté par la passerelle.
 *
 * D'où la validation en deux temps : le MCP ne doit pas refuser de démarrer
 * parce que DISCORD_TOKEN est absent de son environnement.
 */

const supabaseSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  AGENT_TIMEZONE: z.string().default('Europe/Brussels'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

const bridgeSchema = supabaseSchema.extend({
  DISCORD_TOKEN: z.string().min(1),

  /**
   * Liste blanche des identifiants Discord autorisés à lier un compte Nysa.
   * C'est la frontière de sécurité de /lier : sans elle, n'importe qui pourrait
   * rattacher son Discord à ton adresse e-mail.
   */
  AGENT_ALLOWED_DISCORD_IDS: z
    .string()
    .min(1)
    .transform(s => s.split(',').map(v => v.trim()).filter(Boolean)),

  /** Sert UNIQUEMENT à résoudre l'identité et à créer une session. Jamais aux données métier. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  /**
   * En salon de serveur, exiger une mention du bot pour lui répondre.
   *
   * Faux par défaut : sur un serveur personnel, la liste blanche filtre déjà
   * qui peut parler, et devoir écrire « @Condor » à chaque phrase est une
   * friction inutile. À passer à true si le bot rejoint un serveur partagé.
   */
  AGENT_REQUIRE_MENTION: z
    .string()
    .optional()
    .transform(v => v === 'true' || v === '1'),

  /** Binaire Claude Code. Authentifié une fois avec le compte Max : aucun token facturé. */
  CLAUDE_BIN: z.string().default('claude'),
  /** Racine du dépôt Nysa sur le Pi5 — Claude Code y lit CLAUDE.md et le MCP. */
  NYSA_REPO: z.string().min(1),
  /** Garde-fou : au-delà, on coupe. Évite qu'une boucle vide l'abonnement. */
  CLAUDE_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),

  /**
   * Clone local du vault Obsidian. Claude Code y accède avec ses outils de
   * fichiers natifs — aucun MCP n'est nécessaire pour du markdown.
   */
  OBSIDIAN_VAULT: z.string().optional(),

  /**
   * Contrôle du Mac par SSH. Les tools ne se chargent que si l'hôte et
   * l'utilisateur sont renseignés ET que la session y a droit (voir mac.ts).
   */
  MAC_SSH_HOST: z.string().optional(),
  MAC_SSH_USER: z.string().optional(),
  MAC_SSH_KEY: z.string().optional(),
})

/**
 * Le service de courrier (`src/mail/service.ts`) : IMAP en écoute permanente
 * sur les boîtes OVH, dépôt dans work.events au nom du propriétaire.
 * Il n'a pas besoin de Discord ni de Claude Code.
 */
const mailSchema = supabaseSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** Le premier identifiant est le propriétaire : sa session sert au dépôt. */
  AGENT_ALLOWED_DISCORD_IDS: z
    .string()
    .min(1)
    .transform(s => s.split(',').map(v => v.trim()).filter(Boolean)),
  MAIL_HOST: z.string().default('ssl0.ovh.net'),
  MAIL_PORT: z.coerce.number().int().default(993),
  /**
   * Les boîtes à suivre : `marque=adresse`, séparées par des virgules. Le mot
   * de passe de chaque boîte est dans MAIL_PASS_<MARQUE> (en majuscules).
   */
  MAIL_ACCOUNTS: z
    .string()
    .min(1)
    .transform(s =>
      s.split(',').map(v => v.trim()).filter(Boolean).map(paire => {
        const [marque, adresse] = paire.split('=').map(x => x.trim())
        if (!marque || !adresse || !['mixologue', 'aeterna'].includes(marque)) {
          throw new Error(`MAIL_ACCOUNTS : « ${paire} » n'est pas de la forme mixologue=adresse ou aeterna=adresse`)
        }
        return { marque: marque as 'mixologue' | 'aeterna', adresse }
      }),
    ),
  /** Au premier démarrage (ou si la boîte change d'UIDVALIDITY) : combien de jours reprendre. */
  MAIL_BACKFILL_DAYS: z.coerce.number().int().min(0).default(1),
  /** Dernier UID vu par boîte, pour reprendre où on s'était arrêté. */
  MAIL_STATE_FILE: z.string().default(''),
})

function parseOrDie<T extends z.ZodTypeAny>(schema: T, what: string): z.infer<T> {
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map(i => `  - ${i.path.join('.') || '(racine)'} : ${i.message}`)
      .join('\n')
    console.error(`Configuration ${what} invalide — vérifie agent/.env :\n${details}`)
    process.exit(1)
  }
  return parsed.data
}

export function mcpConfig() {
  return parseOrDie(supabaseSchema, 'MCP')
}

export function bridgeConfig() {
  return parseOrDie(bridgeSchema, 'passerelle')
}

export function mailConfig() {
  return parseOrDie(mailSchema, 'courrier')
}
