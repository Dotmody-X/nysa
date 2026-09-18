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

/** Le jeton OAuth du compte Max, lu dans le HOME du Pi : seule sa date d'expiration nous intéresse. */
async function sessionClaude(): Promise<string> {
  try {
    const brut = JSON.parse(await readFile(join(homedir(), '.claude', '.credentials.json'), 'utf8')) as { claudeAiOauth?: { expiresAt?: number } }
    const exp = brut.claudeAiOauth?.expiresAt
    if (!exp) return 'session Claude : état inconnu'
    const restant = exp - Date.now()
    const jours = Math.floor(restant / 86_400_000)
    if (restant < 0) return '🔴 session Claude EXPIRÉE — `claude auth login --claudeai` sur le Pi puis `sudo systemctl restart nysa-agent`'
    if (jours < 2) return `🟠 session Claude expire dans ${Math.max(1, Math.round(restant / 3_600_000))} h`
    return `session Claude valide (${jours} j)`
  } catch {
    return 'session Claude : fichier introuvable'
  }
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

  const ok = (s: string) => (s === 'active' ? '🟢' : '🔴')
  const lignes = [
    `**Pouls Nysa** — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    `${ok(mail)} nysa-mail ${mail} · ${ok(agent)} nysa-agent ${agent}`,
    `📨 dernier mail ${dernier === null ? 'jamais' : dernier < 1 ? "à l'instant" : `il y a ${dernier} h`} · ${p.unprocessed ?? '?'} à traiter`,
    `🧭 Claude hier : ${u.demandes ?? 0} demande(s), ${u.triages ?? 0} triage(s) · ${await sessionClaude()}`,
  ]
  if (dernier !== null && dernier > 48) lignes.push('⚠️ Aucun mail depuis deux jours : vérifier `journalctl -u nysa-mail`.')
  const envoye = await alerter(lignes.join('\n'))
  process.exit(envoye ? 0 : 1)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
