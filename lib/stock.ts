// Utilitaires de quantités/stock : comparer ce qu'une recette demande à ce
// qu'il y a dans l'inventaire maison (localStorage), avec normalisation
// d'unités au mieux (masse → g, volume → ml, reste → unité).

export type Base = 'g' | 'ml' | 'unit'

const MASS: Record<string, number> = {
  mg: 0.001, g: 1, gr: 1, gramme: 1, grammes: 1, kg: 1000, kilo: 1000, kilos: 1000,
}
const VOL: Record<string, number> = {
  ml: 1, cl: 10, dl: 100, l: 1000, litre: 1000, litres: 1000,
}

export const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export function toBase(value: number, unitRaw?: string): { value: number; base: Base } {
  const u = norm(unitRaw || '')
  if (u in MASS) return { value: value * MASS[u], base: 'g' }
  if (u in VOL) return { value: value * VOL[u], base: 'ml' }
  return { value, base: 'unit' } // pc, pièce, x, cuillère, cup, botte, boîte…
}

/** Parse une quantité d'inventaire libre ("1 kg", "x6", "500 ml", "2 boîtes"). */
export function parseInvQty(qty: string): { value: number; base: Base } {
  const s = norm(qty)
  const xm = s.match(/^x\s*(\d+(?:[.,]\d+)?)/)
  if (xm) return { value: parseFloat(xm[1].replace(',', '.')), base: 'unit' }
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*([a-zïî]+)?/)
  if (!m) return { value: 1, base: 'unit' }
  return toBase(parseFloat(m[1].replace(',', '.')), m[2])
}

export type StockCheck = { sufficient: boolean; deficit: number }

/**
 * La recette demande `reqQty reqUnit`. `inv` = article d'inventaire trouvé
 * (ou undefined). Renvoie si le stock suffit, et le déficit (dans reqUnit).
 */
export function checkStock(reqQty: number, reqUnit: string, inv?: { qty: string; status?: string }): StockCheck {
  if (!inv) return { sufficient: false, deficit: reqQty }
  const req = toBase(reqQty, reqUnit)
  const have = parseInvQty(inv.qty || '')
  if (req.base === have.base && req.value > 0) {
    const sufficient = have.value >= req.value
    const deficitBase = Math.max(0, req.value - have.value)
    const perUnit = req.value / reqQty // valeur base pour 1 reqUnit
    const deficit = perUnit ? deficitBase / perUnit : deficitBase
    return { sufficient, deficit: Math.round(deficit * 100) / 100 }
  }
  // Unités non comparables → on se fie au statut de l'inventaire
  if ((inv.status ?? '') === 'ok') return { sufficient: true, deficit: 0 }
  return { sufficient: false, deficit: reqQty }
}

/** Trouve un article d'inventaire par nom (insensible accents/casse, tolérant). */
export function findInv<T extends { name: string }>(items: T[], name: string): T | undefined {
  const n = norm(name)
  if (!n) return undefined
  return items.find(i => norm(i.name) === n)
    || items.find(i => norm(i.name).includes(n) || n.includes(norm(i.name)))
}

/**
 * Convertit une quantité + unité en GRAMMES (pour le calcul nutritionnel,
 * les macros étant exprimées pour 100 g).
 *  - g/kg/mg → masse ; ml/cl/l → volume (densité ≈ 1)
 *  - cuillère = cuillère à soupe ≈ 15 g ; cup = cuillère à café ≈ 5 g
 *  - pc/pièce/unité → quantité × poids d'une pièce (gramsPerPiece)
 */
export function unitToGrams(quantity: number, unit?: string, gramsPerPiece = 100): number {
  const q = quantity || 0
  const u = norm(unit || '')
  const mass: Record<string, number> = { mg: 0.001, g: 1, gr: 1, gramme: 1, grammes: 1, kg: 1000, kilo: 1000, kilos: 1000 }
  const vol: Record<string, number> = { ml: 1, cl: 10, dl: 100, l: 1000, litre: 1000, litres: 1000 }
  if (u in mass) return q * mass[u]
  if (u in vol) return q * vol[u]
  if (['cuillere', 'cuilleres', 'cas', 'c.a.s', 'tbsp', 'cuillere a soupe'].includes(u)) return q * 15
  if (['cup', 'cac', 'c.a.c', 'tsp', 'cuillere a cafe'].includes(u)) return q * 5
  if (['pc', 'piece', 'pieces', 'unite', 'unites', 'u', 'x'].includes(u)) return q * gramsPerPiece
  return q // unité inconnue/vide → on suppose des grammes
}

/** Additionne deux quantités libres si comparables, sinon garde l'existante. */
export function mergeQty(existing: string, added: string): string {
  const a = parseInvQty(existing || ''), b = parseInvQty(added || '')
  if (a.base !== b.base) return existing || added || '1'
  const total = Math.round((a.value + b.value) * 100) / 100
  const label = b.base === 'g' ? ' g' : b.base === 'ml' ? ' ml' : ''
  return `${total}${label}`
}
