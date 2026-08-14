import React from 'react'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

interface PageTitleProps {
  title: string
  sub?: string
  right?: React.ReactNode
  /** Couleur de catégorie de la page (var(--accent-…)). Défaut : marque. */
  accent?: string
  /** Icône de la section, affichée dans le sticker d'en-tête. */
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  /** Encre de l'icône si l'accent est foncé (cobalt, indigo, violet…). */
  iconInk?: string
}

/**
 * En-tête de page — signature « collage » NYSA :
 * sticker d'accent incliné + titre géant au contour + filet épais.
 */
export function PageTitle({
  title, sub, right, accent = 'var(--accent-brand)', icon: Icon, iconInk = 'var(--ink-dark)',
}: PageTitleProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3" style={{ marginBottom: 18 }}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5" style={{ marginBottom: 6 }}>
          {Icon && (
            <span
              className="sticker-l nb-tile flex items-center justify-center"
              style={{ width: 28, height: 28, background: accent, boxShadow: '2px 2px 0 var(--ink)' }}
            >
              <Icon size={15} style={{ color: iconInk }} />
            </span>
          )}
          {sub && (
            <p className="text-[10px] font-extrabold uppercase truncate" style={{ ...DF, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>
              {sub}
            </p>
          )}
        </div>

        <h1
          className="text-outline"
          style={{
            ...DF,
            fontWeight: 900,
            fontSize: 'clamp(34px, 5vw, 58px)',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            lineHeight: 0.95,
          }}
        >
          {title}
        </h1>

        <div className="rule-thick" style={{ width: 56, background: accent, marginTop: 8 }} />
      </div>

      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="kpi-grid grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 12 }}>
      {children}
    </div>
  )
}

export function KpiCard({
  label, value, sub, color = 'var(--text)', bg, accent, progress,
}: {
  label: string; value: string; sub?: string; color?: string; bg?: string
  /** Barre d'accent en tête de carte (couleur de catégorie). */
  accent?: string
  /** 0 → 1 : affiche une barre de progression au lieu du sous-titre. */
  progress?: number
}) {
  return (
    <div
      className="nb-card flex flex-col justify-between p-4"
      style={{ background: bg ?? 'var(--bg-card)', minHeight: 96 }}
    >
      <div className="flex items-center gap-2">
        {accent && <span style={{ width: 10, height: 10, borderRadius: 3, background: accent, border: '1.5px solid var(--ink)', flexShrink: 0 }} />}
        <p className="text-[10px] font-extrabold uppercase truncate" style={{ ...DF, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>
          {label}
        </p>
      </div>

      <p style={{ ...DF, fontWeight: 900, fontSize: 28, color, lineHeight: 1, marginTop: 6 }}>{value}</p>

      {progress !== undefined ? (
        <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-input)', border: '1px solid var(--border)', overflow: 'hidden', marginTop: 6 }}>
          <div style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`, height: '100%', background: accent ?? 'var(--accent-brand)' }} />
        </div>
      ) : (
        sub && <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>
      )}
    </div>
  )
}

export function SectionCard({ children, title, titleColor = 'var(--text)', bg, action, style, num, accent }: {
  children: React.ReactNode; title?: string; titleColor?: string
  bg?: string; action?: React.ReactNode; style?: React.CSSProperties
  /** Numéro éditorial affiché au contour (01, 02…). */
  num?: string
  /** Pastille de couleur de section. */
  accent?: string
}) {
  return (
    <div className="nb-card" style={{ background: bg ?? 'var(--bg-card)', overflow: 'hidden', padding: 0, ...style }}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '2px solid var(--ink)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            {num && (
              <span className="text-outline" style={{ ...DF, fontWeight: 900, fontSize: 20, lineHeight: 1, WebkitTextStrokeWidth: '1.5px' }}>
                {num}
              </span>
            )}
            {accent && <span style={{ width: 10, height: 10, borderRadius: 3, background: accent, border: '1.5px solid var(--ink)', flexShrink: 0 }} />}
            <p className="text-[11px] font-extrabold uppercase truncate" style={{ ...DF, letterSpacing: '0.14em', color: titleColor }}>
              {title}
            </p>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

/** Bouton d'action en sticker — langage collage partagé par toutes les pages. */
export function StickerButton({
  children, onClick, accent = 'var(--accent-brand)', ink = 'var(--ink-dark)', tilt = 'r', type = 'button', title,
}: {
  children: React.ReactNode
  onClick?: () => void
  accent?: string
  ink?: string
  tilt?: 'l' | 'r' | 'none'
  type?: 'button' | 'submit'
  title?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      className={`nb-press flex items-center gap-2 px-4 py-2 ${tilt === 'none' ? '' : tilt === 'l' ? 'sticker-l' : 'sticker-r'}`}
      style={{
        ...DF, fontWeight: 800, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
        background: accent, color: ink, border: '2px solid var(--ink)',
        boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
