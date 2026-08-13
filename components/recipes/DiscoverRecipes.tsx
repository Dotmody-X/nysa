'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Check, Loader2 } from '@/components/ui/icons'
import { RECIPE_PACK } from '@/lib/recipePack'
import { searchMeals, randomMeals, mealToDraft, type MealSummary } from '@/lib/theMealDb'
import type { DraftRecipe } from '@/lib/recipeImport'
import { exportRecipesJson, parseRecipesJson } from '@/lib/recipeIO'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ORANGE = 'var(--accent-budget)'
const TEAL = 'var(--azul)'
const WHEAT = 'var(--text)'

/**
 * Fenêtre « Découvrir des recettes » : deux sources.
 *  - Pack FR curé (bundlé, macros parfaites via CIQUAL)
 *  - TheMealDB (en ligne, recettes internationales)
 * Chaque carte s'importe en un clic dans les recettes de l'utilisateur.
 */
export function DiscoverRecipes({
  onClose,
  onImport,
  recipes = [],
  initialTab = 'pack',
}: {
  onClose: () => void
  onImport: (draft: DraftRecipe) => Promise<void>
  recipes?: unknown[]
  initialTab?: 'pack' | 'online' | 'io'
}) {
  const [tab, setTab] = useState<'pack' | 'online' | 'io'>(initialTab)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MealSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [url, setUrl] = useState('')
  const [ioMsg, setIoMsg] = useState<string | null>(null)
  const [ioBusy, setIoBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function downloadExport() {
    const blob = new Blob([exportRecipesJson(recipes as never[])], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href; a.download = `nysa-recettes-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(href)
  }

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIoBusy(true); setIoMsg(null)
    try {
      const drafts = parseRecipesJson(await file.text())
      for (const d of drafts) await onImport(d)
      setIoMsg(`${drafts.length} recette${drafts.length > 1 ? 's' : ''} importée${drafts.length > 1 ? 's' : ''}.`)
    } catch (err) { setIoMsg('Fichier invalide : ' + (err as Error).message) }
    finally { setIoBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function importFromUrl() {
    if (!url.trim()) return
    setIoBusy(true); setIoMsg(null)
    try {
      const res = await fetch(`/api/import-recipe?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json()
      if (data.draft) { await onImport(data.draft); setIoMsg(`« ${data.draft.name} » importée.`); setUrl('') }
      else setIoMsg(data.error || 'Échec de l\'import.')
    } catch { setIoMsg('Impossible de contacter le serveur.') }
    finally { setIoBusy(false) }
  }

  const loadRandom = useCallback(async () => {
    setLoading(true)
    setResults(await randomMeals(8))
    setLoading(false)
  }, [])

  // Suggestions au hasard à l'ouverture de l'onglet en ligne
  useEffect(() => {
    if (tab === 'online' && results.length === 0 && !query.trim()) loadRandom()
  }, [tab, results.length, query, loadRandom])

  // Recherche en ligne (débouncée)
  useEffect(() => {
    if (tab !== 'online' || !query.trim()) return
    const t = setTimeout(async () => {
      setLoading(true)
      setResults(await searchMeals(query))
      setLoading(false)
    }, 500)
    return () => clearTimeout(t)
  }, [query, tab])

  async function doImport(key: string, draft: DraftRecipe) {
    setImporting(key)
    try { await onImport(draft) ; setDone(prev => new Set(prev).add(key)) }
    finally { setImporting(null) }
  }

  const tabBtn = (active: boolean): React.CSSProperties => ({
    ...DF, fontSize: 12, fontWeight: 800, padding: '8px 16px', borderRadius: 'var(--radius-md)',
    cursor: 'pointer', border: '2px solid var(--ink)',
    background: active ? ORANGE : 'var(--bg-card)', color: active ? 'var(--chocolate)' : 'var(--text-muted)',
    boxShadow: active ? '3px 3px 0 var(--ink)' : 'none',
  })

  const importBtn = (key: string): React.CSSProperties => ({
    ...DF, fontSize: 10, fontWeight: 800, padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
    border: '2px solid var(--ink)', whiteSpace: 'nowrap',
    background: done.has(key) ? TEAL : ORANGE, color: done.has(key) ? 'var(--creamy-ivory)' : 'var(--chocolate)',
  })

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg)', borderRadius: 'var(--radius-xl)', border: '2px solid var(--ink)', boxShadow: '6px 6px 0 var(--ink)', width: '100%', maxWidth: 820, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '2px solid var(--ink)' }}>
          <p style={{ ...DF, fontSize: 20, fontWeight: 900, color: ORANGE, flex: 1 }}>Découvrir des recettes</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: WHEAT, padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 22px 0' }}>
          <button style={tabBtn(tab === 'pack')} onClick={() => setTab('pack')}>Pack FR ({RECIPE_PACK.length})</button>
          <button style={tabBtn(tab === 'online')} onClick={() => setTab('online')}>En ligne · TheMealDB</button>
          <button style={tabBtn(tab === 'io')} onClick={() => setTab('io')}>Import / Export</button>
        </div>

        {/* Recherche (online) */}
        {tab === 'online' && (
          <div style={{ padding: '14px 22px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 40, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '2px solid var(--ink)' }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Chercher (en anglais : chicken, pasta, curry…)"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text)' }} />
              {loading && <Loader2 size={14} className="spin" style={{ color: ORANGE }} />}
            </div>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6 }}>
              Recettes en anglais — macros estimées pour les ingrédients reconnus.
            </p>
          </div>
        )}

        {/* Contenu */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 22, display: tab === 'io' ? 'block' : 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, alignContent: 'start' }}>
          {tab === 'io' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 460 }}>
              {/* Export */}
              <div>
                <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: WHEAT, marginBottom: 6 }}>Exporter mes recettes</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Télécharge toutes tes recettes dans un fichier JSON (sauvegarde / partage).</p>
                <button onClick={downloadExport} disabled={(recipes as unknown[]).length === 0}
                  style={{ ...DF, fontSize: 11, fontWeight: 800, padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', background: ORANGE, color: 'var(--chocolate)', cursor: (recipes as unknown[]).length ? 'pointer' : 'default', opacity: (recipes as unknown[]).length ? 1 : 0.5 }}>
                  Télécharger ({(recipes as unknown[]).length})
                </button>
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* Import fichier */}
              <div>
                <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: WHEAT, marginBottom: 6 }}>Importer un fichier JSON</p>
                <input ref={fileRef} type="file" accept="application/json,.json" onChange={importFile}
                  style={{ fontSize: 11, color: 'var(--text)' }} />
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* Import URL */}
              <div>
                <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: WHEAT, marginBottom: 6 }}>Importer depuis une URL</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Colle le lien d&apos;une recette (Marmiton, 750g, etc.) — lecture du balisage de la page.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" onKeyDown={e => e.key === 'Enter' && importFromUrl()}
                    style={{ flex: 1, background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--text)', outline: 'none' }} />
                  <button onClick={importFromUrl} disabled={ioBusy || !url.trim()}
                    style={{ ...DF, fontSize: 11, fontWeight: 800, padding: '8px 14px', borderRadius: 8, border: '2px solid var(--ink)', background: ORANGE, color: 'var(--chocolate)', cursor: ioBusy || !url.trim() ? 'default' : 'pointer', opacity: ioBusy || !url.trim() ? 0.5 : 1 }}>
                    {ioBusy ? '…' : 'Importer'}
                  </button>
                </div>
              </div>

              {ioMsg && (
                <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '2px solid var(--ink)', color: WHEAT, fontSize: 12 }}>{ioMsg}</div>
              )}
            </div>
          )}

          {tab === 'pack' && RECIPE_PACK.map(r => {
            const key = `pack-${r.name}`
            return (
              <div key={key} style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)', boxShadow: '3px 3px 0 var(--ink)', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: WHEAT, lineHeight: 1.25 }}>{r.name}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4, flex: 1 }}>{r.description}</p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(r.tags ?? []).slice(0, 3).map(t => (
                    <span key={t} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(14,149,148,0.12)', color: TEAL, ...DF, fontWeight: 700 }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.ingredients.length} ingrédients · {r.servings} pers.</span>
                  <button style={importBtn(key)} disabled={importing === key || done.has(key)} onClick={() => doImport(key, r)}>
                    {importing === key ? '…' : done.has(key) ? <><Check size={11} style={{ display: 'inline', marginRight: 2 }} />Importée</> : 'Importer'}
                  </button>
                </div>
              </div>
            )
          })}

          {tab === 'online' && !loading && results.length === 0 && (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 30 }}>
              {query.trim() ? 'Aucun résultat.' : 'Tape un plat pour chercher.'}
            </p>
          )}

          {tab === 'online' && results.map(m => {
            const key = `off-${m.id}`
            return (
              <div key={key} style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)', boxShadow: '3px 3px 0 var(--ink)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {m.thumb && <img src={m.thumb} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', borderBottom: '2px solid var(--ink)' }} />}
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <p style={{ ...DF, fontSize: 12, fontWeight: 800, color: WHEAT, lineHeight: 1.25, flex: 1 }}>{m.name}</p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[m.area, m.category].filter(Boolean).map(t => (
                      <span key={t as string} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(242,84,45,0.12)', color: ORANGE, ...DF, fontWeight: 700 }}>{t}</span>
                    ))}
                  </div>
                  <button style={{ ...importBtn(key), width: '100%', padding: '7px' }} disabled={importing === key || done.has(key)} onClick={() => doImport(key, mealToDraft(m.meal))}>
                    {importing === key ? '…' : done.has(key) ? <><Check size={11} style={{ display: 'inline', marginRight: 2 }} />Importée</> : 'Importer'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .spin { animation: discspin 0.8s linear infinite; }
        @keyframes discspin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
