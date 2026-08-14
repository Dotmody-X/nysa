'use client'

import { Sun, Moon } from '@/components/ui/icons'
import { toneColor, priorityColor, PRIORITY_LABEL, brandColor, digestIcon } from '@/lib/digestStyle'
import type { Digest, DigestPayload, DigestStat, DigestPriority, DigestSection, DigestItem, DigestFlag } from '@/hooks/useDigests'

/* ============================================================
   Rendu ÉDITORIAL d'un brief/débrief.
   Parti pris : la hiérarchie vient de la typo et des filets,
   pas de l'empilement de boîtes. Une seule surface encadrée —
   la carte elle-même. Tout le reste est du texte réglé.
   ============================================================ */

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const WHEAT = 'var(--text)'
const BRIEF_COLOR = 'var(--azul)'
const DEBRIEF_COLOR = 'var(--accent-brand)'

const kindMeta = (kind: string) => kind === 'debrief'
  ? { label: 'Débrief', color: DEBRIEF_COLOR, Icon: Moon }
  : { label: 'Brief', color: BRIEF_COLOR, Icon: Sun }

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

const num2 = (i: number) => String(i + 1).padStart(2, '0')

/* Petit label de rubrique : numéro au contour + intitulé + filet. */
function RubricHead({ num, label, color, icon: Icon }: {
  num: string; label: string; color: string
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
      <span className="text-outline" style={{ ...DF, fontSize: 17, fontWeight: 900, lineHeight: 1, WebkitTextStrokeWidth: '1.2px' }}>{num}</span>
      {Icon && <Icon size={13} style={{ color, flexShrink: 0 }} />}
      <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: WHEAT, whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ flex: 1, height: 2, background: 'var(--ink)', opacity: 0.85, borderRadius: 1, minWidth: 12 }} />
    </div>
  )
}

/* ── Marque : pastille + nom, sans fond ── */
function BrandTag({ brand }: { brand?: string }) {
  if (!brand) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: brandColor(brand), border: '1.5px solid var(--ink)', flexShrink: 0 }} />
      <span style={{ ...DF, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{brand}</span>
    </span>
  )
}

/* ── Bandeau de chiffres ──────────────────────────────────────
   Flex (et non grid) : les cellules d'une rangée incomplète
   s'étirent pour la remplir — pas de trou. La taille du chiffre
   s'adapte au nombre de colonnes et à la longueur de la valeur. */
function StatStrip({ stats }: { stats: DigestStat[] }) {
  const dense = stats.length >= 5
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', borderTop: '2px solid var(--ink)', borderBottom: '2px solid var(--ink)' }}>
      {stats.map((s, i) => {
        const txt = String(s.value)
        // « 8h27 » ne doit pas déborder de sa colonne.
        const size = txt.length > 4 ? 22 : txt.length > 3 ? 26 : dense ? 30 : 36
        return (
          <div key={i}
            style={{
              flex: '1 1 0%', minWidth: 74, padding: '12px 13px 13px',
              borderLeft: i === 0 ? 'none' : '1px solid var(--border)',
            }}>
            <p style={{ ...DF, fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, lineHeight: 1.25 }}>
              {s.label}
            </p>
            <p style={{ ...DF, fontSize: size, fontWeight: 900, lineHeight: 0.9, color: toneColor(s.tone), letterSpacing: '-0.035em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {txt}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/* ── Alerte : filet épais à gauche, pas de cadre ── */
function FlagLine({ flag }: { flag: DigestFlag }) {
  const c = toneColor(flag.tone)
  return (
    <div style={{ display: 'flex', gap: 10, padding: '2px 0 2px 12px', borderLeft: `4px solid ${c}` }}>
      <p style={{ fontSize: 12, color: WHEAT, fontWeight: 600, lineHeight: 1.5 }}>{flag.text}</p>
    </div>
  )
}

/* ── Priorité : numéro géant + titre, séparateur en filet ── */
function PriorityRow({ p, i, last }: { p: DigestPriority; i: number; last: boolean }) {
  const pc = priorityColor(p.priority)
  return (
    <div style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span style={{ ...DF, fontSize: 28, fontWeight: 900, lineHeight: 0.9, color: pc, minWidth: 34, letterSpacing: '-0.04em' }}>
        {num2(i)}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: WHEAT, lineHeight: 1.35 }}>{p.title}</p>
          {p.priority && (
            <span style={{ ...DF, fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: pc, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {PRIORITY_LABEL[p.priority] ?? p.priority}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <BrandTag brand={p.brand} />
          {p.due && <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>⏳ {p.due}</span>}
        </div>
        {p.note && <p style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.note}</p>}
      </div>
    </div>
  )
}

/* ── Ligne d'item ── */
function ItemRow({ item, last }: { item: DigestItem; last: boolean }) {
  const c = item.tone ? toneColor(item.tone) : null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span style={{ width: 5, height: 5, borderRadius: 1, background: item.brand ? brandColor(item.brand) : (c ?? 'var(--text-subtle)'), marginTop: 7, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: c ?? WHEAT, lineHeight: 1.55 }}>{item.text}</span>
      {item.badge && (
        <span style={{ ...DF, fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: c ?? 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>
          {item.badge}
        </span>
      )}
    </div>
  )
}

/* ── Rubrique de section ── */
function SectionBlock({ s, i, color }: { s: DigestSection; i: number; color: string }) {
  const Icon = digestIcon(s.icon)
  const items = s.items ?? []
  return (
    <div>
      <RubricHead num={num2(i)} label={s.title} color={color} icon={Icon} />
      {items.length === 0
        ? <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Rien à signaler.</p>
        : items.map((it, k) => <ItemRow key={k} item={it} last={k === items.length - 1} />)}
    </div>
  )
}

/* ── Corps structuré ── */
function PayloadBody({ p, color }: { p: DigestPayload; color: string }) {
  const stats = Array.isArray(p.stats) ? p.stats : []
  const flags = Array.isArray(p.flags) ? p.flags : []
  const priorities = Array.isArray(p.priorities) ? p.priorities : []
  const sections = Array.isArray(p.sections) ? p.sections : []

  // Numérotation continue : priorités puis sections.
  const prioIndex = priorities.length > 0 ? 0 : -1
  const sectionOffset = priorities.length > 0 ? 1 : 0

  return (
    <>
      {p.headline && (
        <p style={{ padding: '16px 20px 14px', fontSize: 14.5, color: WHEAT, lineHeight: 1.55, fontWeight: 500 }}>
          {p.headline}
        </p>
      )}

      {stats.length > 0 && <StatStrip stats={stats} />}

      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {flags.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {flags.map((f, i) => <FlagLine key={i} flag={f} />)}
          </div>
        )}

        {priorities.length > 0 && (
          <div>
            <RubricHead num={num2(prioIndex)} label="Priorités" color={color} />
            {priorities.map((pr, i) => (
              <PriorityRow key={i} p={pr} i={i} last={i === priorities.length - 1} />
            ))}
          </div>
        )}

        {sections.map((s, i) => (
          <SectionBlock key={i} s={s} i={i + sectionOffset} color={color} />
        ))}
      </div>
    </>
  )
}

/* ── Repli markdown ── */
function MarkdownFallback({ content, color }: { content: string; color: string }) {
  const text = (content ?? '').trim()
  const parts = text.split(/\n(?=##\s)/).map(s => s.trim()).filter(Boolean)
  const blocks = parts.length > 0 ? parts : (text ? [text] : [])
  return (
    <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {blocks.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucun contenu.</p>}
      {blocks.map((block, i) => {
        const m = block.match(/^##\s+(.*)/)
        const title = m ? m[1].trim() : null
        const body = (m ? block.slice(m[0].length) : block).trim()
        return (
          <div key={i}>
            {title && <RubricHead num={num2(i)} label={title} color={color} />}
            {body && <p style={{ fontSize: 12.5, color: WHEAT, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{body}</p>}
          </div>
        )
      })}
    </div>
  )
}

/* ── Carte digest ── */
export function DigestCard({ digest }: { digest: Digest }) {
  const m = kindMeta(digest.kind)
  const p = digest.payload
  const title = p?.title || m.label
  const dateStr = p?.date || fmtDateTime(digest.generated_at)

  return (
    /* Tranche colorée en haut : identifie le type d'un coup d'œil. */
    <div className="nb-card" style={{ padding: 0, overflow: 'hidden', borderTop: `10px solid ${m.color}` }}>
      {/* En-tête éditorial : sticker + type, titre au contour, filet épais */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
          <span className="sticker-l nb-tile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: m.color, boxShadow: '2px 2px 0 var(--ink)', flexShrink: 0 }}>
            <m.Icon size={15} style={{ color: 'var(--ink-light)' }} />
          </span>
          <span style={{ ...DF, fontSize: 9.5, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: m.color }}>
            {m.label}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
            {dateStr}
          </span>
        </div>

        <h3 className="text-outline" style={{ ...DF, fontSize: 'clamp(24px, 3.2vw, 34px)', fontWeight: 900, lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.025em', WebkitTextStrokeWidth: '1.6px' }}>
          {title}
        </h3>

        <div className="rule-thick" style={{ background: m.color, marginTop: 10 }} />
      </div>

      {p ? <PayloadBody p={p} color={m.color} /> : <MarkdownFallback content={digest.content} color={m.color} />}
    </div>
  )
}
