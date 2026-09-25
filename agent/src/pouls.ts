import 'dotenv/config'
import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { mailConfig } from './config.js'
import { serviceSession } from './identity.js'
import { userClient } from './supabase.js'
import { alerter } from './alertes.js'

const exec = promisify(execFile)

/**
 * Le pouls du matin dans #alertes-systeme : les services tournent-ils, le
 * courrier est-il entré hier, la session Claude Code du Pi tient-elle
 * encore. Trois lignes qu'on lit en dix secondes — et qui manquaient le jour
 * où n8n s'est tu.
 */
async function etatService(nom: string): Promise<string> {
  try {
    const { stdout } = await exec('systemctl', ['is-active', nom])
    return stdout.trim()
  } catch (e) {
    return (e as { stdout?: string }).stdout?.trim() || 'inconnu'
  }
}

/**
 * L'état de la session Claude Code (compte Max), lu dans le HOME du Pi.
 *
 * Trois cas d'échec, appris le 25 septembre 2026 : le jeton d'accès expire
 * (normal, il se rafraîchit), le jeton de rafraîchissement expire (il faut se
 * reconnecter), et — ce qui nous a échappé — Claude Code VIDE les deux jetons
 * quand le rafraîchissement échoue. `expiresAt` disparaît alors, et lire ce
 * seul champ faisait conclure « état inconnu » au lieu de « expirée ».
 */
async function sessionClaude(): Promise<{ texte: string; alerte: boolean }> {
  const chemin = join(homedir(), '.claude', '.credentials.json')
  let oauth: { accessToken?: string; refreshToken?: string; expiresAt?: number; refreshTokenExpiresAt?: number }
  try {
    oauth = (JSON.parse(await readFile(chemin, 'utf8')) as { claudeAiOauth?: typeof oauth }).claudeAiOauth ?? {}
  } catch {
    return { texte: '🔴 session Claude : aucun identifiant sur le Pi', alerte: true }
  }

  const remede = '`claude auth login --claudeai` sur le Pi, puis `sudo systemctl restart nysa-agent`'
  if (!oauth.accessToken || !oauth.refreshToken) {
    return { texte: `🔴 session Claude VIDÉE (le rafraîchissement a échoué) — ${remede}`, alerte: true }
  }
  const finRefresh = oauth.refreshTokenExpiresAt ?? 0
  if (finRefresh && finRefresh < Date.now()) {
    return { texte: `🔴 session Claude EXPIRÉE — ${remede}`, alerte: true }
  }
  if (finRefresh) {
    const jours = Math.floor((finRefresh - Date.now()) / 86_400_000)
    if (jours <= 3) return { texte: `🟠 session Claude à renouveler sous ${jours <= 0 ? "moins d'un jour" : `${jours} j`} — ${remede}`, alerte: true }
    return { texte: `session Claude valide (${jours} j)`, alerte: false }
  }
  return { texte: 'session Claude : connectée, échéance inconnue', alerte: false }
}

async function main() {
  const config = mailConfig()
  const [mail, agent] = await Promise.all([etatService('nysa-mail'), etatService('nysa-agent')])
  const session = await serviceSession('nysa-mail', config.AGENT_ALLOWED_DISCORD_IDS[0]!)
  const db = userClient(session.accessToken)
  const [pouls, usage] = await Promise.all([db.rpc('get_work_pulse'), db.rpc('get_claude_usage', { p_jours: 1 })])
  const p = (pouls.data ?? {}) as { last_mail_at?: string; unprocessed?: number; today?: number }
  const u = (usage.data ?? {}) as { demandes?: number; triages?: number }
  const dernier = p.last_mail_at ? Math.round((Date.now() - new Date(p.last_mail_at).getTime()) / 3_600_000) : null

  const claude = await sessionClaude()
  const ok = (s: string) => (s === 'active' ? '🟢' : '🔴')
  const lignes = [
    `**Pouls Nysa** — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    `${ok(mail)} nysa-mail ${mail} · ${ok(agent)} nysa-agent ${agent}`,
    `📨 dernier mail ${dernier === null ? 'jamais' : dernier < 1 ? "à l'instant" : `il y a ${dernier} h`} · ${p.unprocessed ?? '?'} à traiter`,
    `🧭 Claude hier : ${u.demandes ?? 0} demande(s), ${u.triages ?? 0} triage(s) · ${claude.texte}`,
  ]
  if (dernier !== null && dernier > 48) lignes.push('⚠️ Aucun mail depuis deux jours : vérifier `journalctl -u nysa-mail`.')
  // Une session morte bloque triage, Discord et actions : le pouls le dit en tête.
  if (claude.alerte) lignes.splice(1, 0, claude.texte)
  const envoye = await alerter(lignes.join('\n'))
  process.exit(envoye ? 0 : 1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
