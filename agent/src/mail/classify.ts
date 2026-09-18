/**
 * D'un mail à un événement de work.events. Reprise fidèle des deux nœuds
 * « Code » du workflow n8n qui faisait ce travail jusqu'au 14 août 2026 :
 * mêmes titres, mêmes sources, mêmes identifiants externes, pour que la
 * dédoublonnage (user_id, source, external_id) continue de fonctionner sur
 * l'historique.
 */

export type MarqueMail = 'mixologue' | 'aeterna'

export type MailBrut = {
  uid: number
  subject: string
  /** « Nom <adresse> », comme le nœud IMAP de n8n le rendait. */
  from: string
  to: string
  date: Date | null
  messageId: string | null
  text: string
  html: string
  attachments: number
}

/** Les arguments de public.log_work_event, prêts à envoyer. */
export type Evenement = {
  p_brand: MarqueMail
  p_type: 'mail' | 'order' | 'appointment'
  p_source: 'imap-ovh' | 'woocommerce-mail' | 'amelia'
  p_title: string
  p_payload: Record<string, unknown>
  p_urgency: 1 | 2 | 3
  p_external_id: string
  p_occurred_at?: string
}

/** Les mails que personne ne veut voir dans l'inbox. */
const IGNORER = ['automatically updated', 'some plugins were', 'some themes were', 'newsletter']

const URGENT: Record<MarqueMail, string[]> = {
  aeterna: ['urgent', 'relance', 'impayé', 'impaye', 'litige', 'rendez-vous'],
  mixologue: ['urgent', 'relance', 'impayé', 'impaye', 'litige', 'devis', 'commande ', 'bat'],
}

const PREFIXE: Record<MarqueMail, string> = { aeterna: 'ae', mixologue: 'mx' }

/** Extrait un champ du mail de rendez-vous Amelia (HTML ou texte). */
function champ(html: string, label: string): string | null {
  let m = html.match(new RegExp(label + '<\\/p>\\s*<p[^>]*>\\s*([^<]+?)\\s*<\\/p>', 'i'))
  if (m) return m[1]!.replace(/&amp;/g, '&').trim()
  m = html.match(new RegExp(label + '\\s*[\\r\\n]+\\s*(.+)', 'i'))
  return m ? m[1]!.trim() : null
}

/** Une date locale (Europe/Brussels) en ISO, sans luxon. */
function dateLocale(y: number, mo: number, d: number, h: number, mi: number, zone: string): string {
  const naive = Date.UTC(y, mo - 1, d, h, mi)
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  const parts = Object.fromEntries(fmt.formatToParts(new Date(naive)).map(p => [p.type, p.value]))
  const vuDansLaZone = Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour! % 24, +parts.minute!)
  return new Date(naive - (vuDansLaZone - naive)).toISOString()
}

/** Un extrait lisible pour la liste du poste : le texte, sinon le HTML dépouillé. */
function extrait(m: MailBrut): string {
  const texte = (m.text || m.html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' '))
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  return texte.slice(0, 280)
}

/** null = à ignorer. */
export function classer(m: MailBrut, marque: MarqueMail, zone = 'Europe/Brussels', boite?: string): Evenement | null {
  const objet = m.subject || ''
  const sujet = objet.toLowerCase()
  if (IGNORER.some(k => sujet.includes(k))) return null

  const pref = PREFIXE[marque]
  const mid = m.messageId || (m.uid ? `uid-${pref}-${m.uid}` : `${pref}|${m.date?.toISOString() ?? ''}|${objet}`)
  const base: Pick<Evenement, 'p_occurred_at'> = m.date ? { p_occurred_at: m.date.toISOString() } : {}

  // Rendez-vous Amelia confirmé (Aeterna).
  if (marque === 'aeterna' && sujet.includes('nouveau rendez-vous')) {
    const html = m.html || m.text || ''
    const service = champ(html, 'Service')
    const dateStr = champ(html, 'Date') // « 03.08.2026 »
    const heure = champ(html, 'Heure') // « 14:00 »
    const lieu = champ(html, 'Lieu')
    if (dateStr && heure) {
      const dm = service?.match(/\((\d+)\s*min\)/i)
      const duree_min = dm ? parseInt(dm[1]!, 10) : 60
      const [d, mo, y] = dateStr.split('.').map(Number)
      const [hh, mi] = heure.split(':').map(Number)
      if (d && mo && y && hh !== undefined && mi !== undefined) {
        const ext = `amelia-${[dateStr, heure, service].join('|')}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')
        return {
          p_brand: 'aeterna',
          p_type: 'appointment',
          p_source: 'amelia',
          p_title: `RDV ${service || 'Aeterna'}`,
          p_payload: { service, duree_min, location: lieu, status: 'approved' },
          p_urgency: 2,
          p_external_id: ext.slice(0, 200),
          p_occurred_at: dateLocale(y, mo, d, hh, mi, zone),
        }
      }
    }
    // Corps non parsable : on ne perd rien, ça retombe en 'mail' ci-dessous.
  }

  const commande = marque === 'aeterna'
    ? objet.match(/new order:?\s*#(\d+)/i)
    : objet.match(/(?:new order|nouvelle commande)\s*:?\s*#?(\d+)/i)
  if (commande) {
    return {
      ...base,
      p_brand: marque,
      p_type: 'order',
      p_source: 'woocommerce-mail',
      p_title: `Commande #${commande[1]}`,
      p_payload: { order_id: Number(commande[1]) },
      p_urgency: 2,
      p_external_id: `wc-${pref}-${commande[1]}`,
    }
  }

  const urgent = URGENT[marque].some(k => sujet.includes(k))
  return {
    ...base,
    p_brand: marque,
    p_type: 'mail',
    p_source: 'imap-ovh',
    p_title: objet || '(sans objet)',
    // `from` seul suffisait aux briefs ; le poste veut aussi lire de quoi il s'agit.
    p_payload: { from: m.from, to: m.to, snippet: extrait(m), attachments: m.attachments, ...(boite ? { mailbox: boite } : {}) },
    p_urgency: urgent ? 1 : 3,
    p_external_id: String(mid).slice(0, 200),
  }
}
