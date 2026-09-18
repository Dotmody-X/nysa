import type React from 'react'

/* Vocabulaire visuel du poste : le même que le reste de Nysa (contour encre,
   ombre dure), en un peu plus grand — l'iPad se lit à bout de bras. */

export const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
export const WHEAT = 'var(--text)'

export const BRAND_LABEL: Record<string, string> = {
  mixologue: 'Mixologue', esmoker: 'e-Smoker', aeterna: 'Aeterna', transverse: 'Transverse',
}
/** work.brand_t → nom utilisé par lib/digestStyle.brandColor. */
export const BRAND_NAME: Record<string, string> = {
  mixologue: 'Le Mixologue', esmoker: 'E-Smoker', aeterna: 'Aeterna', transverse: 'Transverse',
}

export const panneau = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)',
  boxShadow: '4px 4px 0 var(--ink)', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', ...extra,
})

export const titrePanneau: React.CSSProperties = {
  ...DF, fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: WHEAT,
}

export const bouton = (accent: string, encre = 'var(--ink-light)', extra: React.CSSProperties = {}): React.CSSProperties => ({
  ...DF, fontSize: 12, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase',
  padding: '10px 14px', minHeight: 40, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)', background: accent, color: encre,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, whiteSpace: 'nowrap', ...extra,
})

export const boutonDiscret = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  ...DF, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
  padding: '6px 10px', minHeight: 32, borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  border: '2px solid var(--ink)', background: 'var(--bg-input)', color: 'var(--text-muted)',
  display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', ...extra,
})

/** « il y a 3 min », « il y a 2 h », « hier », « il y a 5 j ». */
export function depuis(iso: string | null | undefined, maintenant = Date.now()): string {
  if (!iso) return '—'
  const s = Math.max(0, Math.floor((maintenant - new Date(iso).getTime()) / 1000))
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24)
  return j === 1 ? 'hier' : `il y a ${j} j`
}

export function fmtHeure(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDuree(secondes: number): string {
  const h = Math.floor(secondes / 3600)
  const m = Math.floor((secondes % 3600) / 60)
  const s = secondes % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}
