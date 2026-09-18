'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, Gavel, BarChart2, TrendingUp, Newspaper } from '@/components/ui/icons'
import { useVeille, CATEGORIE_LABEL, PAYS_LABEL } from '@/hooks/useVeille'
import type { VeilleBrand, VeilleCategory, VeilleCountry, VeilleItem } from '@/hooks/useVeille'
import { useDigests } from '@/hooks/useDigests'
import { DigestCard } from '@/components/brief/DigestCard'
import { brandColor, toneColor } from '@/lib/digestStyle'
import { prochainLundi, fmtJour, lundiDe } from '@/lib/radar'

/* ============================================================
   Veille hebdomadaire d'une marque : le récit de la semaine
   (un digest, même carte que le Brief) puis le journal des
   éléments trouvés — lois, études, tendances, articles —
   groupés par semaine et filtrables. La tâche du lundi écrit,
   ici on ne fait que lire.
   ============================================================ */

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const WHEAT = 'var(--text)'

const CATEGORIES: VeilleCategory[] = ['loi', 'marche', 'tendance', 'news']
const PAYS: VeilleCountry[] = ['BE', 'FR', 'LU', 'CH', 'IT', 'EU']
const CAT_ICON: Record<VeilleCategory, typeof Gavel> = { loi: Gavel, marche: BarChart2, tendance: TrendingUp, news: Newspaper }
const IMPORTANCE: Record<number, { label: string; tone: string } | null> = {
  1: null, 2: { label: 'Important', tone: 'warning' }, 3: { label: 'Critique', tone: 'danger' },
}

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)',
  boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden', ...extra,
})

// Segments encrés — même langage que les onglets du Brief et du calendrier.
const chip = (active: boolean, color: string): React.CSSProperties => ({
  ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
  padding: '8px 14px', minHeight: 36, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  border: '2px solid var(--ink)',
  boxShadow: active ? '3px 3px 0 var(--ink)' : 'none',
  background: active ? color : 'var(--bg-input)',
  color: active ? 'var(--ink-light)' : 'var(--text-muted)',
})

const fmtDate = (iso: string) =>
  new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

const aujourdhui = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

/* ── Une ligne du journal ── */
function ItemRow({ item, color, last }: { item: VeilleItem; color: string; last: boolean }) {
  const Icon = CAT_ICON[item.category] ?? Newspaper
  const imp = IMPORTANCE[item.importance]
  // Une loi pas encore en vigueur : la date compte plus que la source.
  const aVenir = item.effective_at && new Date(item.effective_at + 'T00:00:00') >= aujourdhui()
  const meta: React.ReactNode[] = []
  if (item.source) meta.push(item.source)
  if (item.country) meta.push(<span title={PAYS_LABEL[item.country]}>{item.country}</span>)
  if (item.published_at) meta.push(`publié le ${fmtDate(item.published_at)}`)
  if (item.effective_at) meta.push(
    <span style={{ color: aVenir ? toneColor('warning') : undefined, fontWeight: aVenir ? 800 : undefined }}>
      en vigueur le {fmtDate(item.effective_at)}
    </span>,
  )

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span className="nb-tile" title={CATEGORIE_LABEL[item.category]}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: color, boxShadow: '2px 2px 0 var(--ink)', flexShrink: 0, marginTop: 1 }}>
        <Icon size={13} style={{ color: 'var(--ink-light)' }} />
      </span>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer"
              style={{ ...DF, flex: 1, fontSize: 13.5, fontWeight: 800, color: WHEAT, lineHeight: 1.3, textDecoration: 'none', display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
              <span>{item.title}</span>
              <ExternalLink size={11} style={{ color: 'var(--text-muted)', flexShrink: 0, position: 'relative', top: 1 }} />
            </a>
          ) : (
            <span style={{ ...DF, flex: 1, fontSize: 13.5, fontWeight: 800, color: WHEAT, lineHeight: 1.3 }}>{item.title}</span>
          )}
          {imp && (
            <span style={{ ...DF, fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: toneColor(imp.tone), whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>
              {imp.label}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: WHEAT, lineHeight: 1.55, opacity: 0.9 }}>{item.summary}</p>
        {(meta.length > 0 || item.tags.length > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)' }}>
            {meta.map((m, i) => <span key={i} style={{ display: 'inline-flex', gap: 6 }}>{i > 0 && <span>·</span>}{m}</span>)}
            {item.tags.map(t => (
              <span key={t} style={{ ...DF, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '1px 6px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function Veille({ brand }: { brand: VeilleBrand }) {
  const color = brandColor(brand)
  const kind = brand === 'E-Smoker' ? 'veille_esmoker' : 'veille_aeterna'
  const recit = useDigests([kind])
  const { items, loading, error } = useVeille(brand)
  const [cat, setCat] = useState<VeilleCategory | 'tous'>('tous')
  const [pays, setPays] = useState<VeilleCountry | 'tous'>('tous')
  const parPays = brand === 'E-Smoker' // Aeterna vend partout : pas de filtre pays

  const dernier = recit.digests[0] ?? null
  const prochain = useMemo(() => prochainLundi(), [])

  const compteCat = useMemo(() => {
    const c: Record<string, number> = {}
    for (const it of items) c[it.category] = (c[it.category] ?? 0) + 1
    return c
  }, [items])

  const filtres = useMemo(() => items.filter(it =>
    (cat === 'tous' || it.category === cat) && (pays === 'tous' || it.country === pays),
  ), [items, cat, pays])

  // Groupés par semaine de capture, la plus récente en tête.
  const semaines = useMemo(() => {
    const m = new Map<number, { lundi: Date; items: VeilleItem[] }>()
    for (const it of filtres) {
      const lundi = lundiDe(it.captured_at)
      const k = lundi.getTime()
      if (!m.has(k)) m.set(k, { lundi, items: [] })
      m.get(k)!.items.push(it)
    }
    return [...m.values()].sort((a, b) => b.lundi.getTime() - a.lundi.getTime())
  }, [filtres])

  // Les lois à venir : ce qui va changer, toutes semaines confondues.
  const loisAVenir = useMemo(() => {
    const auj = aujourdhui()
    return items
      .filter(it => it.category === 'loi' && it.effective_at && new Date(it.effective_at + 'T00:00:00') >= auj)
      .sort((a, b) => (a.effective_at! < b.effective_at! ? -1 : 1))
  }, [items])

  const chargement = loading || recit.loading
  const vide = !chargement && !dernier && items.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>
      {(error || recit.error) && (
        <div style={{ ...card(), padding: '12px 16px', color: 'var(--accent-brand)', fontSize: 12 }}>
          Impossible de charger la veille : {error ?? recit.error}
        </div>
      )}

      {chargement ? (
        <div style={{ ...card(), padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Chargement…</div>
      ) : vide ? (
        <div style={{ ...card(), padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
          Aucune veille encore pour {brand}. La première tombera {fmtJour(prochain)}.
        </div>
      ) : (
        <>
          {dernier && <DigestCard digest={dernier} />}

          {loisAVenir.length > 0 && (
            <div className="nb-card" style={{ padding: 0, overflow: 'hidden', borderLeft: `8px solid ${toneColor('warning')}` }}>
              <div style={{ padding: '12px 16px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Gavel size={13} style={{ color: toneColor('warning') }} />
                <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: WHEAT }}>
                  Ce qui entre en vigueur
                </span>
              </div>
              {loisAVenir.slice(0, 6).map((it, i, arr) => (
                <div key={it.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 16px', borderTop: i === 0 ? 'none' : '1px solid var(--border)', paddingBottom: i === arr.length - 1 ? 12 : 7 }}>
                  <span style={{ ...DF, fontSize: 11, fontWeight: 900, color: toneColor('warning'), whiteSpace: 'nowrap', minWidth: 96 }}>{fmtDate(it.effective_at!)}</span>
                  {it.country && <span style={{ ...DF, fontSize: 9.5, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>{it.country}</span>}
                  <span style={{ flex: 1, fontSize: 12.5, color: WHEAT, lineHeight: 1.45 }}>{it.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Filtres : catégories (avec compte), puis pays pour e-Smoker */}
          <div className="toolbar-scroll" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button className="nb-press" style={chip(cat === 'tous', 'var(--ink-dark)')} onClick={() => setCat('tous')}>Tout · {items.length}</button>
            {CATEGORIES.map(c => (
              <button key={c} className="nb-press" style={chip(cat === c, color)} onClick={() => setCat(c)}>
                {CATEGORIE_LABEL[c]} · {compteCat[c] ?? 0}
              </button>
            ))}
          </div>
          {parPays && (
            <div className="toolbar-scroll" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: -8 }}>
              <button className="nb-press" style={{ ...chip(pays === 'tous', 'var(--ink-dark)'), padding: '5px 10px', minHeight: 28, fontSize: 10 }} onClick={() => setPays('tous')}>Tous pays</button>
              {PAYS.map(p => (
                <button key={p} className="nb-press" title={PAYS_LABEL[p]} style={{ ...chip(pays === p, color), padding: '5px 10px', minHeight: 28, fontSize: 10 }} onClick={() => setPays(p)}>{p}</button>
              ))}
            </div>
          )}

          {/* Le journal, semaine par semaine */}
          {semaines.length === 0 ? (
            <div style={{ ...card(), padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Rien pour ces filtres.</div>
          ) : semaines.map(s => (
            <div key={s.lundi.getTime()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: WHEAT, whiteSpace: 'nowrap' }}>
                  Semaine du {s.lundi.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </span>
                <span style={{ flex: 1, height: 2, background: 'var(--ink)', opacity: 0.85, borderRadius: 1 }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)' }}>{s.items.length}</span>
              </div>
              <div className="nb-card" style={{ padding: 0, overflow: 'hidden' }}>
                {s.items.map((it, i) => <ItemRow key={it.id} item={it} color={color} last={i === s.items.length - 1} />)}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
