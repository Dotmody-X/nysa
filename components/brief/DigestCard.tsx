'use client'

import { Sun, Moon } from '@/components/ui/icons'
import { toneColor, priorityColor, PRIORITY_LABEL, brandColor, digestIcon } from '@/lib/digestStyle'
import type { Digest, DigestPayload, DigestStat, DigestPriority, DigestSection, DigestItem, DigestFlag } from '@/hooks/useDigests'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const WHEAT = 'var(--text)'
const BRIEF_COLOR = 'var(--azul)'
const DEBRIEF_COLOR = 'var(--accent-budget)'

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--ink)',
  boxShadow: '4px 4px 0 var(--ink)', overflow: 'hidden', ...extra,
})

const kindMeta = (kind: string) => kind === 'debrief'
  ? { label: 'Débrief', color: DEBRIEF_COLOR, Icon: Moon }
  : { label: 'Brief', color: BRIEF_COLOR, Icon: Sun }

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

/* ── Pastille marque ── */
function BrandDot({ brand }: { brand?: string }) {
  if (!brand) return null
  return <span title={brand} style={{ width: 9, height: 9, borderRadius: '50%', background: brandColor(brand), border: '1.5px solid var(--ink)', flexShrink: 0, display: 'inline-block' }} />
}
function BrandBadge({ brand }: { brand?: string }) {
  if (!brand) return null
  const c = brandColor(brand)
  return <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, color: '#fff', background: c, whiteSpace: 'nowrap' }}>{brand}</span>
}

/* ── Tuile KPI (stat) ── */
function StatTile({ stat }: { stat: DigestStat }) {
  const c = toneColor(stat.tone)
  return (
    <div style={{ ...card(), padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '3px 3px 0 var(--ink)' }}>
      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{stat.label}</span>
      <span style={{ ...DF, fontSize: 24, fontWeight: 900, color: c, lineHeight: 1 }}>{String(stat.value)}</span>
    </div>
  )
}

/* ── Carte priorité ── */
function PriorityCard({ p }: { p: DigestPriority }) {
  const pc = priorityColor(p.priority)
  return (
    <div style={{ ...card(), padding: 14, borderLeft: `5px solid ${pc}`, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '3px 3px 0 var(--ink)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: WHEAT, lineHeight: 1.3 }}>{p.title}</p>
        {p.priority && (
          <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 20, color: '#fff', background: pc, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {PRIORITY_LABEL[p.priority] ?? p.priority}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {p.brand && <BrandBadge brand={p.brand} />}
        {p.due && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>⏳ {p.due}</span>}
      </div>
      {p.note && <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.note}</p>}
    </div>
  )
}

/* ── Ligne d'item (section) ── */
function ItemRow({ item }: { item: DigestItem }) {
  const c = item.tone ? toneColor(item.tone) : null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      {item.brand ? <span style={{ marginTop: 4 }}><BrandDot brand={item.brand} /></span>
        : <span style={{ width: 5, height: 5, borderRadius: '50%', background: c ?? 'var(--text-muted)', marginTop: 6, flexShrink: 0 }} />}
      <span style={{ flex: 1, fontSize: 12.5, color: c ?? WHEAT, lineHeight: 1.5 }}>{item.text}</span>
      {item.badge && (
        <span style={{ ...DF, fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 20, color: c ?? 'var(--text-muted)', background: (c ?? 'var(--text-muted)') + '22', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.badge}</span>
      )}
    </div>
  )
}

/* ── Carte section ── */
function SectionCard({ s }: { s: DigestSection }) {
  const Icon = digestIcon(s.icon)
  return (
    <div style={{ ...card(), padding: 0, boxShadow: '3px 3px 0 var(--ink)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '2px solid var(--ink)', background: 'var(--bg-input)' }}>
        <Icon size={15} style={{ color: 'var(--accent-budget)' }} />
        <span style={{ ...DF, fontSize: 12, fontWeight: 800, color: WHEAT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.title}</span>
      </div>
      <div style={{ padding: '4px 14px 10px' }}>
        {(s.items ?? []).map((it, i) => <ItemRow key={i} item={it} />)}
        {(!s.items || s.items.length === 0) && <p style={{ fontSize: 11, color: 'var(--text-muted)', padding: '8px 0' }}>—</p>}
      </div>
    </div>
  )
}

/* ── Encadré flag ── */
function FlagBox({ flag }: { flag: DigestFlag }) {
  const c = toneColor(flag.tone)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: c + '18', border: `2px solid ${c}` }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: WHEAT, fontWeight: 600, lineHeight: 1.4 }}>{flag.text}</span>
    </div>
  )
}

/* ── Corps structuré (payload) ── */
function PayloadBody({ p }: { p: DigestPayload }) {
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {p.headline && <p style={{ fontSize: 14, color: WHEAT, lineHeight: 1.6, fontWeight: 500 }}>{p.headline}</p>}

      {Array.isArray(p.stats) && p.stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {p.stats.map((s, i) => <StatTile key={i} stat={s} />)}
        </div>
      )}

      {Array.isArray(p.flags) && p.flags.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {p.flags.map((f, i) => <FlagBox key={i} flag={f} />)}
        </div>
      )}

      {Array.isArray(p.priorities) && p.priorities.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priorités</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {p.priorities.map((pr, i) => <PriorityCard key={i} p={pr} />)}
          </div>
        </div>
      )}

      {Array.isArray(p.sections) && p.sections.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {p.sections.map((s, i) => <SectionCard key={i} s={s} />)}
        </div>
      )}
    </div>
  )
}

/* ── Repli markdown (lignes sans payload) : découpe par titres ## ── */
function MarkdownFallback({ content }: { content: string }) {
  const text = (content ?? '').trim()
  const parts = text.split(/\n(?=##\s)/).map(s => s.trim()).filter(Boolean)
  const blocks = parts.length > 0 ? parts : (text ? [text] : [])
  return (
    <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {blocks.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucun contenu.</p>}
      {blocks.map((block, i) => {
        const m = block.match(/^##\s+(.*)/)
        const title = m ? m[1].trim() : null
        const body = (m ? block.slice(m[0].length) : block).trim()
        return (
          <div key={i} style={{ ...card(), padding: 0, boxShadow: '3px 3px 0 var(--ink)' }}>
            {title && (
              <div style={{ padding: '10px 14px', borderBottom: '2px solid var(--ink)', background: 'var(--bg-input)' }}>
                <span style={{ ...DF, fontSize: 12, fontWeight: 800, color: WHEAT }}>{title}</span>
              </div>
            )}
            {body && <p style={{ padding: '12px 14px', fontSize: 12.5, color: WHEAT, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{body}</p>}
          </div>
        )
      })}
    </div>
  )
}

/* ── Carte digest complète ── */
export function DigestCard({ digest }: { digest: Digest }) {
  const m = kindMeta(digest.kind)
  const p = digest.payload
  const title = p?.title || m.label
  const dateStr = p?.date || fmtDateTime(digest.generated_at)
  return (
    <div style={{ ...card(), padding: 0 }}>
      <div style={{ background: m.color, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <m.Icon size={18} style={{ color: 'var(--creamy-ivory)' }} />
        <span style={{ ...DF, fontSize: 10, fontWeight: 800, color: 'var(--creamy-ivory)', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>{m.label}</span>
        <span style={{ ...DF, fontSize: 15, fontWeight: 900, color: 'var(--creamy-ivory)', flex: 1, minWidth: 120 }}>{title}</span>
        <span style={{ fontSize: 11, color: 'rgba(245,241,237,0.9)', textTransform: 'capitalize' }}>{dateStr}</span>
      </div>
      {p ? <PayloadBody p={p} /> : <MarkdownFallback content={digest.content} />}
    </div>
  )
}
