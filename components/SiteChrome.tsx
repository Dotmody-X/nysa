'use client'

import { useAppConfig, useIsAdmin } from '@/hooks/useAppConfig'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

/**
 * Habillage global piloté par la config admin :
 *  - bannière d'annonce (si active),
 *  - écran de maintenance pour les non-admins (les admins passent au travers).
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const { config, loading } = useAppConfig()
  const isAdmin = useIsAdmin()

  if (!loading && config.maintenance && !isAdmin) {
    return (
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 30, textAlign: 'center' }}>
        <span style={{ fontSize: 40 }}>🛠️</span>
        <p style={{ ...DF, fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>Maintenance en cours</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360 }}>
          {config.announcement.text || 'NYSA est temporairement indisponible. Reviens dans un instant.'}
        </p>
      </div>
    )
  }

  return (
    <>
      {config.announcement.active && config.announcement.text && (
        <div style={{ padding: '10px 18px', background: 'var(--accent-budget)', color: 'var(--chocolate)', borderBottom: '2px solid var(--ink)', ...DF, fontWeight: 700, fontSize: 12, textAlign: 'center' }}>
          📣 {config.announcement.text}
        </div>
      )}
      {children}
    </>
  )
}
