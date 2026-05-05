import React from 'react'

interface PageTitleProps {
  title: string
  sub?: string
  right?: React.ReactNode
}

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

export function PageTitle({ title, sub, right }: PageTitleProps) {
  return (
    <div className="flex items-end justify-between" style={{ marginBottom: 20 }}>
      <div>
        <h1 style={{ ...DF, fontWeight: 900, fontSize: 'clamp(28px, 4vw, 44px)', color: '#F2542D', textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1 }}>
          {title}<span style={{ color: 'var(--accent)' }}>.</span>
        </h1>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, letterSpacing: '0.05em' }}>{sub}</p>}
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-[10px]" style={{ marginBottom: 10 }}>
      {children}
    </div>
  )
}

export function KpiCard({
  label, value, sub, color = 'var(--wheat)', bg = 'var(--bg-card)',
}: { label: string; value: string; sub?: string; color?: string; bg?: string }) {
  return (
    <div className="flex flex-col justify-between p-4" style={{ background: bg, borderRadius: 12, border: '1px solid var(--border)', minHeight: 90 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, color, lineHeight: 1, marginTop: 6 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

export function SectionCard({ children, title, titleColor = 'var(--accent)', bg = 'var(--bg-card)', action, style }: {
  children: React.ReactNode; title?: string; titleColor?: string
  bg?: string; action?: React.ReactNode; style?: React.CSSProperties
}) {
  return (
    <div style={{ background: bg, borderRadius: 12, border: bg === 'var(--bg-card)' ? '1px solid var(--border)' : 'none', overflow: 'hidden', ...style }}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: titleColor, textTransform: 'uppercase' }}>{title}</p>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
