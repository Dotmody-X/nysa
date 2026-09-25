import { log } from './log.js'

/**
 * Une alerte dans le salon #alertes-systeme, par l'API REST de Discord avec
 * le token du bot — sans discord.js, pour que ça marche aussi depuis un
 * processus qui n'est pas la passerelle (systemd OnFailure, pouls du matin),
 * et même quand c'est la passerelle qui est tombée.
 *
 * La leçon de n8n : ce qui se tait doit crier ailleurs.
 */

const API = 'https://discord.com/api/v10'
const SALON = process.env.ALERTES_SALON || 'alertes-systeme'
const UA = 'DiscordBot (https://github.com/Dotmody-X/nysa, 0.1)'

let salonId: string | null = null
const dernieres = new Map<string, number>()

async function discord(path: string, init?: RequestInit): Promise<unknown> {
  const token = process.env.DISCORD_TOKEN
  if (!token) throw new Error('DISCORD_TOKEN absent')
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bot ${token}`, 'User-Agent': UA, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!r.ok) throw new Error(`Discord ${r.status} sur ${path}`)
  return r.json()
}

async function trouverSalon(): Promise<string> {
  if (salonId) return salonId
  const guilds = (await discord('/users/@me/guilds')) as { id: string }[]
  for (const g of guilds) {
    const salons = (await discord(`/guilds/${g.id}/channels`)) as { id: string; name: string; type: number }[]
    const s = salons.find(c => c.type === 0 && c.name.toLowerCase() === SALON.toLowerCase())
    if (s) { salonId = s.id; return s.id }
  }
  throw new Error(`Salon #${SALON} introuvable`)
}

/**
 * Poste le message. `cle` + `toutesLesMs` : une même alerte n'est pas
 * répétée plus souvent que ça (une session expirée ferait sinon un message
 * par mail à trier).
 */
export async function alerter(message: string, cle?: string, toutesLesMs = 3_600_000): Promise<boolean> {
  if (cle) {
    const derniere = dernieres.get(cle) ?? 0
    if (Date.now() - derniere < toutesLesMs) return false
    dernieres.set(cle, Date.now())
  }
  try {
    const id = await trouverSalon()
    await discord(`/channels/${id}/messages`, { method: 'POST', body: JSON.stringify({ content: message.slice(0, 1900) }) })
    // Tracée : après un incident, on veut savoir si l'alarme a sonné.
    log.info(`Alerte envoyée dans #${SALON}${cle ? ` [${cle}]` : ''} : ${message.split('\n')[0]!.slice(0, 80)}`)
    return true
  } catch (e) {
    log.error(`Alerte non envoyée : ${e instanceof Error ? e.message : String(e)}`)
    return false
  }
}
