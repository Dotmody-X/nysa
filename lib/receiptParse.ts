// Analyse heuristique du TEXTE d'un ticket de caisse / facture (extrait d'un
// PDF ou collé). Renvoie magasin, date et lignes d'articles {nom, qté, prix}.
// Volontairement tolérant : l'utilisateur vérifie/corrige avant validation.

import { guessCategory } from './catalogue'

export type ReceiptItem = {
  name: string
  quantity: number
  unit?: string
  unitPrice?: number
  total: number
  category?: string
}

export type ParsedReceipt = {
  store?: string
  date?: string // YYYY-MM-DD
  items: ReceiptItem[]
}

const STORES = [
  'Carrefour', 'Leclerc', 'E.Leclerc', 'Lidl', 'Aldi', 'Auchan', 'Intermarché',
  'Super U', 'Hyper U', 'Casino', 'Monoprix', 'Franprix', 'Biocoop', 'Cora',
  'Netto', 'Grand Frais', 'Picard', 'Naturalia', 'Match', 'Spar', 'Colruyt', 'Delhaize',
]

// Lignes à ignorer (totaux, paiements, TVA…)
const SKIP = /\b(total|sous[-\s]?total|tva|t\.v\.a|montant|carte|cb|esp[èe]ces|rendu|monnaie|reçu|caisse|ticket|merci|client|fid[ée]lit[ée]|points?|remise|paiement|ht|ttc|net [àa] payer|email|siret|tel|t[ée]l)\b/i

const money = (s: string) => parseFloat(s.replace(/\s/g, '').replace(',', '.'))

function findStore(text: string): string | undefined {
  const head = text.slice(0, 600).toLowerCase()
  for (const s of STORES) if (head.includes(s.toLowerCase().replace('e.leclerc', 'leclerc'))) {
    return s === 'E.Leclerc' ? 'Leclerc' : s
  }
  return undefined
}

function findDate(text: string): string | undefined {
  const m = text.match(/(\d{2})[\/.\- ](\d{2})[\/.\- ](\d{2,4})/)
  if (!m) return undefined
  let [, d, mo, y] = m
  if (y.length === 2) y = '20' + y
  const day = parseInt(d), month = parseInt(mo)
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

/** Analyse le texte brut d'un ticket en lignes d'articles. */
export function parseReceiptText(text: string): ParsedReceipt {
  const store = findStore(text)
  const date = findDate(text)
  const items: ReceiptItem[] = []

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  let pendingQty: { quantity: number; unitPrice: number } | null = null

  for (const line of lines) {
    if (SKIP.test(line)) { pendingQty = null; continue }

    // Ligne « 2 x 1,25 » ou « 2 X 1.25 € » → quantité + prix unitaire (le total est souvent sur la ligne suivante/au bout)
    const qm = line.match(/^(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+[.,]\d{2})\s*€?$/)
    if (qm) { pendingQty = { quantity: money(qm[1]), unitPrice: money(qm[2]) }; continue }

    // Prix en fin de ligne (avec ou sans €), éventuellement précédé d'un nom
    const pm = line.match(/^(.*?)(\d+[.,]\d{2})\s*€?\s*[A-Z]?$/)
    if (!pm) continue
    let name = pm[1].replace(/[.\-–•·*]+$/g, '').replace(/\s{2,}/g, ' ').trim()
    const total = money(pm[2])
    if (!Number.isFinite(total) || total <= 0) continue

    // Quantité éventuelle dans le nom : « x2 », « 2x », « 500g »
    let quantity = 1
    let unit: string | undefined
    let unitPrice: number | undefined
    const inlineQty = name.match(/(?:^|\s)(?:x\s*(\d+)|(\d+)\s*x)(?:\s|$)/i)
    if (inlineQty) { quantity = parseInt(inlineQty[1] || inlineQty[2]); name = name.replace(inlineQty[0], ' ').trim() }
    const gMatch = name.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|l|cl|ml)\b/i)
    if (gMatch) { unit = gMatch[2].toLowerCase() }

    if (pendingQty) { quantity = pendingQty.quantity; unitPrice = pendingQty.unitPrice; pendingQty = null }
    else unitPrice = quantity > 0 ? Math.round((total / quantity) * 100) / 100 : total

    name = name.replace(/^\d+\s+/, '').trim()
    if (name.length < 2 || /^\d+$/.test(name)) continue

    items.push({ name, quantity, unit, unitPrice, total, category: guessCategory(name) })
  }

  return { store, date, items }
}
