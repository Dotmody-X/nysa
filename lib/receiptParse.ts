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

// Lignes à ignorer (totaux, paiements, TVA, en-têtes magasin…)
const SKIP = /\b(total|sous[-\s]?total|tva|t\.v\.a|montant|carte|cb|esp[èe]ces|rendu|monnaie|reçu|caisse|ticket|merci|client|fid[ée]lit[ée]|points?|remise|r[ée]duction|xtra|paiement|ht|ttc|net\s*[àa]\s*payer|[àa]\s*payer|email|siret|t[ée]l|iban|swift|bic|bancontact|maestro|visa|mastercard|eurocard|magasin|boucherie|ouverture|caissier|caissi[èe]re|d[ée]nomination|prix\s*unitaire|vidanges?|sous-?total)\b/i

const money = (s: string) => parseFloat(s.replace(/\s/g, '').replace(',', '.'))

/** Détecte une ligne « bruit » : en-tête, total, paiement, horaires, codes. */
function isNoise(line: string): boolean {
  if (SKIP.test(line)) return true
  if ((line.match(/€/g) || []).length >= 2) return true // lignes de total/paiement
  if (/\d{1,2}\s*[.:]\s*\d{2}\s*[-–]\s*\d{1,2}\s*[.:]\s*\d{2}/.test(line)) return true // horaires « 08.00 - 20.00 »
  if (/^[\d\s.\-/]{7,}$/.test(line)) return true // suites de chiffres / codes
  return false
}

// Retire le code TVA (« A », « B »…) et le numéro d'article en tête de ligne.
function cleanItemName(raw: string): string {
  return raw
    .replace(/^[A-Z]\s+/, '')
    .replace(/^\d{3,6}\s+/, '')
    .replace(/[.\-–•·*]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

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
    if (isNoise(line)) { pendingQty = null; continue }

    // Ligne « 2 x 1,25 » ou « 2 X 1.25 € » → quantité + prix unitaire (le total est souvent sur la ligne suivante/au bout)
    const qm = line.match(/^(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+[.,]\d{2})\s*€?$/)
    if (qm) { pendingQty = { quantity: money(qm[1]), unitPrice: money(qm[2]) }; continue }

    // Article au poids : « nom  0,990 kg  8,33  8,25 » (poids · prix/kg · montant)
    const wm = line.match(/^(.*?\S)\s+(\d+[.,]\d{2,3})\s*(kg|g)\s+(\d+[.,]\d{2,3})\s+(\d+[.,]\d{2})\s*$/i)
    if (wm) {
      const weight = money(wm[2]), perKg = money(wm[4]), tot = money(wm[5])
      if (Number.isFinite(tot) && tot > 0 && Math.abs(weight * perKg - tot) <= Math.max(0.05, tot * 0.06)) {
        const name = cleanItemName(wm[1])
        if (name.length >= 2) {
          items.push({ name, quantity: weight, unit: wm[3].toLowerCase(), unitPrice: perKg, total: tot, category: guessCategory(name) })
          pendingQty = null
          continue
        }
      }
    }

    // Format 3 colonnes (Colruyt, Auchan…) : « nom  qté  prixUnitaire  montant »
    const cm = line.match(/^(.*?\S)\s+(\d+(?:[.,]\d+)?)\s+(\d+[.,]\d{2,3})\s+(\d+[.,]\d{2})\s*$/)
    if (cm) {
      const qty = money(cm[2]), up = money(cm[3]), tot = money(cm[4])
      if (Number.isFinite(tot) && tot > 0 && Math.abs(qty * up - tot) <= Math.max(0.05, tot * 0.06)) {
        const name = cleanItemName(cm[1])
        if (name.length >= 2 && !/^\d+$/.test(name)) {
          items.push({ name, quantity: qty || 1, unitPrice: up, total: tot, category: guessCategory(name) })
          pendingQty = null
          continue
        }
      }
    }

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
