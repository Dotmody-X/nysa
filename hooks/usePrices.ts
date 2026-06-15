'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { norm, unitToGrams } from '@/lib/stock'

// Unités de masse/volume → on sait en dériver un prix au gramme
const MASS_VOL = new Set(['g', 'gr', 'gramme', 'grammes', 'kg', 'kilo', 'kilos', 'mg', 'ml', 'cl', 'dl', 'l', 'litre', 'litres'])

export type ProductPrice = {
  id: string
  user_id: string
  product_name: string
  product_key: string
  store: string | null
  quantity: number | null
  unit: string | null
  unit_price: number | null
  total_price: number | null
  date: string
  source: string | null
}

export type NewPrice = {
  product_name: string
  store?: string | null
  quantity?: number | null
  unit?: string | null
  unit_price?: number | null
  total_price?: number | null
  date: string
  source?: string
}

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Base de prix par produit & magasin, alimentée par l'import de tickets.
 * Sert à l'analyse de prix, au coût des recettes et à l'estimation des listes.
 */
export function usePrices() {
  const [prices, setPrices] = useState<ProductPrice[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    const { data } = await getSupabase()
      .from('product_prices')
      .select('*')
      .order('date', { ascending: false })
    setPrices((data as ProductPrice[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPrices() }, [fetchPrices])

  /** Enregistre un lot d'observations de prix (un ticket). */
  async function recordPrices(rows: NewPrice[]): Promise<number> {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0
    const payload = rows
      .filter(r => r.product_name?.trim())
      .map(r => ({
        user_id: user.id,
        product_name: r.product_name,
        product_key: norm(r.product_name),
        store: r.store ?? null,
        quantity: r.quantity ?? null,
        unit: r.unit ?? null,
        unit_price: r.unit_price ?? null,
        total_price: r.total_price ?? null,
        date: r.date,
        source: r.source ?? 'receipt',
      }))
    if (payload.length === 0) return 0
    const { data, error } = await supabase.from('product_prices').insert(payload).select()
    if (!error && data) { setPrices(prev => [...(data as ProductPrice[]), ...prev]); return data.length }
    return 0
  }

  /** Dernier prix unitaire connu pour un produit (optionnellement par magasin). */
  function priceFor(name: string, store?: string): number | null {
    const key = norm(name)
    if (!key) return null
    const matches = prices.filter(p =>
      (p.product_key === key || p.product_key.includes(key) || key.includes(p.product_key)) &&
      (!store || p.store === store) &&
      p.unit_price != null
    )
    return matches.length ? (matches[0].unit_price as number) : null
  }

  /**
   * Prix au 100 g connu pour un produit, dérivé d'une observation au
   * poids/volume (fiable). null si on ne sait pas convertir (achat à la pièce).
   */
  function pricePer100g(name: string): number | null {
    const key = norm(name)
    if (!key) return null
    for (const p of prices) { // déjà triées par date décroissante (plus récent d'abord)
      const k = p.product_key
      if (!(k === key || k.includes(key) || key.includes(k))) continue
      const u = (p.unit ?? '').toLowerCase()
      if (!MASS_VOL.has(u)) continue
      const grams = unitToGrams(p.quantity ?? 0, p.unit ?? undefined)
      const total = p.total_price ?? 0
      if (grams > 0 && total > 0) return Math.round((total / grams) * 100 * 100) / 100
    }
    return null
  }

  const stores = Array.from(new Set(prices.map(p => p.store).filter(Boolean))) as string[]

  return { prices, loading, refetch: fetchPrices, recordPrices, priceFor, pricePer100g, stores }
}
