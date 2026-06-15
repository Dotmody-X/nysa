'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Loader2 } from '@/components/ui/icons'
import { searchCatalog, catalogNutrition, catalogPieceGrams, defaultUnitFor, CATEGORY_EMOJI, type CatalogCategory } from '@/lib/catalogue'
import { searchProducts, guessCategory as guessOffCategory, sourceForCategory, offSourceLabel } from '@/lib/openFoodFacts'

export type PickedItem = {
  name: string
  category?: string
  unit?: string
  barcode?: string
  productId?: string
  /** Macros pour 100 g (kcal, protéines, glucides, lipides) si connues. */
  macros100?: { kcal: number; prot: number; carbs: number; fat: number }
  /** Poids moyen d'une pièce (g) — pour convertir l'unité « pc » en grammes. */
  gramsPerPiece?: number
}

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

/**
 * Champ de saisie avec autocomplétion :
 *  - instantanée sur le catalogue local (aliments, épices, ménager…)
 *  - optionnelle via OpenFoodFacts (produits de marque, en ligne).
 * Contrôlé : la valeur du texte est `query`. Sélectionner une suggestion
 * appelle `onSelect` (nom + catégorie auto + éventuel code-barres).
 */
export function CatalogPicker({
  query,
  onQueryChange,
  onSelect,
  placeholder = 'Nom de l\'article…',
  enableOFF = true,
  autoFocus = false,
  category,
}: {
  query: string
  onQueryChange: (q: string) => void
  onSelect: (item: PickedItem) => void
  placeholder?: string
  enableOFF?: boolean
  autoFocus?: boolean
  /** Rayon ciblé : oriente la recherche OFF vers la bonne base (hygiène, animaux, ménager…). */
  category?: string
}) {
  const offSource = sourceForCategory(category)
  const [open, setOpen] = useState(false)
  const [offLoading, setOffLoading] = useState(false)
  const [offResults, setOffResults] = useState<Awaited<ReturnType<typeof searchProducts>>>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  const local = searchCatalog(query, 8)

  // Ferme le menu au clic extérieur
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // Reset des résultats OFF quand la requête change
  useEffect(() => { setOffResults([]) }, [query])

  async function runOff() {
    if (!query.trim()) return
    setOffLoading(true)
    try { setOffResults(await searchProducts(query, 8, offSource)) }
    catch { setOffResults([]) }
    finally { setOffLoading(false) }
  }

  const pick = (item: PickedItem) => {
    onSelect(item)
    onQueryChange(item.name)
    setOpen(false)
    setOffResults([])
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '9px 12px 9px 32px', fontSize: 12, color: 'var(--text)', outline: 'none',
  }
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
    padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: 'var(--text)',
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      <input
        value={query}
        autoFocus={autoFocus}
        onChange={e => { onQueryChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        style={inputStyle}
      />

      {open && query.trim().length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: 320, overflowY: 'auto',
        }}>
          {/* Catalogue local */}
          {local.map(item => {
            const macros = catalogNutrition(item.name)
            return (
            <button key={`c-${item.name}`} onClick={() => pick({
              name: item.name, category: item.category,
              unit: item.unit ?? defaultUnitFor(item.name),
              macros100: macros ?? undefined,
              gramsPerPiece: catalogPieceGrams(item.name),
            })}
              style={rowStyle} className="cat-row">
              <span style={{ fontSize: 14 }}>{CATEGORY_EMOJI[item.category as CatalogCategory] ?? '•'}</span>
              <span style={{ flex: 1 }}>{item.name}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{item.category}</span>
            </button>
            )
          })}

          {local.length === 0 && offResults.length === 0 && !offLoading && (
            <div style={{ padding: '10px', fontSize: 11, color: 'var(--text-muted)' }}>
              Aucune correspondance locale.
            </div>
          )}

          {/* Action OpenFoodFacts */}
          {enableOFF && (
            <button onClick={runOff} disabled={offLoading}
              style={{ ...rowStyle, borderTop: '1px solid var(--border)', color: 'var(--accent-budget)', ...DF, fontWeight: 700, fontSize: 11 }}>
              {offLoading ? <Loader2 size={13} className="spin" /> : <Search size={13} />}
              {offLoading ? 'Recherche en ligne…' : `Rechercher sur ${offSourceLabel(offSource)}`}
            </button>
          )}

          {/* Résultats OFF */}
          {offResults.map(p => (
            <button key={`off-${p.code}`} onClick={() => pick({
              name: p.product_name,
              category: guessOffCategory(p),
              barcode: p.code,
              productId: p.code,
              macros100: p.nutrition.kcal100 != null ? {
                kcal:  p.nutrition.kcal100 ?? 0,
                prot:  p.nutrition.prot100 ?? 0,
                carbs: p.nutrition.carbs100 ?? 0,
                fat:   p.nutrition.fat100 ?? 0,
              } : undefined,
            })} style={rowStyle} className="cat-row">
              {p.image_front_small_url
                ? <img src={p.image_front_small_url} alt="" width={20} height={20} style={{ borderRadius: 4, objectFit: 'cover' }} />
                : <span style={{ fontSize: 14 }}>🛒</span>}
              <span style={{ flex: 1 }}>{p.product_name}{p.brands ? <span style={{ color: 'var(--text-muted)' }}> · {p.brands.split(',')[0]}</span> : null}</span>
              {p.quantity ? <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{p.quantity}</span> : null}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .cat-row:hover { background: var(--bg-card-hover); }
        .spin { animation: catspin 0.8s linear infinite; }
        @keyframes catspin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
