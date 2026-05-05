'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Activity } from 'lucide-react'
import { useHealth } from '@/hooks/useHealth'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL   = '#0E9594'
const ORANGE = '#F2542D'
const WHEAT  = '#F0E4CC'
const RED    = '#ff5050'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateShort(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
function fmtDur(sec: number) {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}

function HrChart({ data }: { data: { date: string; hr: number }[] }) {
  if (data.length < 2) return null
  const hrs  = data.map(d => d.hr)
  const min  = Math.min(...hrs) - 5; const max = Math.max(...hrs) + 5
  const W = 800; const H = 180; const PAD = 36

  const pts = data.map((d, i) => ({
    x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
    y: PAD + ((max - d.hr) / (max - min)) * (H - PAD * 2),
    ...d,
  }))
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${H - PAD} L ${PAD} ${H - PAD} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="hrgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={RED} stopOpacity={0.2} />
          <stop offset="100%" stopColor={RED} stopOpacity={0} />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = PAD + t * (H - PAD * 2)
        const val = Math.round(max - t * (max - min))
        return (
          <g key={t}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD - 8} y={y + 4} textAnchor="end" style={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
              {val}
            </text>
          </g>
        )
      })}
      <path d={areaD} fill="url(#hrgrad)" />
      <path d={pathD} fill="none" stroke={RED} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={RED} />
          {(i === 0 || i === pts.length - 1 || i % Math.ceil(pts.length / 5) === 0) && (
            <text x={p.x} y={H - 2} textAnchor="middle"
              style={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
              {fmtDateShort(p.date)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function ZoneBar({ name, pct, color, time }: { name: string; pct: number; color: string; time: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ ...DF, fontSize: 11, fontWeight: 700, color }}>{name}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{time} · {pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: color, transition: 'width .5s ease' }} />
      </div>
    </div>
  )
}

export default function FrequenceCardiaqueePage() {
  const router = useRouter()
  const { activities } = useHealth()

  const withHr     = activities.filter(a => a.heart_rate_avg != null)
  const hrData     = withHr.slice().reverse().map(a => ({ date: a.date, hr: a.heart_rate_avg! }))
  const avgHr      = withHr.length ? Math.round(withHr.reduce((s, a) => s + (a.heart_rate_avg ?? 0), 0) / withHr.length) : null
  const maxHr      = withHr.length ? Math.max(...withHr.map(a => a.heart_rate_max ?? a.heart_rate_avg ?? 0)) : null
  const minHr      = withHr.length ? Math.min(...withHr.map(a => a.heart_rate_avg ?? 999)) : null

  const zones = [
    { name: 'Zone 1 — Récupération active',  pct:  8, color: '#3B82F6', time: '~12min' },
    { name: 'Zone 2 — Endurance aérobie',    pct: 35, color: TEAL,      time: '~54min' },
    { name: 'Zone 3 — Tempo / Seuil aérobie',pct: 32, color: ORANGE,    time: '~49min' },
    { name: 'Zone 4 — Seuil lactique',        pct: 18, color: '#F59E0B', time: '~28min' },
    { name: 'Zone 5 — Capacité max (VO2)',    pct:  7, color: RED,       time: '~11min' },
  ]

  return (
    <div style={{ padding: 30, minHeight: '100%', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36,
            borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          <ArrowLeft size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
        <div>
          <p style={{ ...DF, fontSize: 24, fontWeight: 900, color: RED, lineHeight: 1 }}>Fréquence cardiaque</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{withHr.length} sorties avec données FC</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { l: 'FC Moyenne (repos moy.)', v: avgHr ? `${avgHr} bpm` : '—', color: RED },
          { l: 'FC Max enregistrée',      v: maxHr ? `${maxHr} bpm` : '—', color: ORANGE },
          { l: 'FC Repos estimée',        v: minHr ? `${minHr} bpm` : '—', color: TEAL },
          { l: 'Sorties analysées',       v: String(withHr.length),         color: WHEAT },
        ].map(s => (
          <div key={s.l} style={{ padding: '18px 20px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{s.l}</p>
            <p style={{ ...DF, fontSize: 24, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.v}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 16 }}>
        {/* Chart */}
        <div style={{ padding: 24, borderRadius: 12, background: '#16162A', border: '1px solid rgba(255,80,80,0.15)' }}>
          <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,80,80,0.7)', textTransform: 'uppercase', marginBottom: 16 }}>
            Tendance FC
          </p>
          {hrData.length >= 2 ? (
            <HrChart data={hrData} />
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <Heart size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Pas assez de données</p>
            </div>
          )}
        </div>

        {/* Zones */}
        <div style={{ padding: 24, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: ORANGE, textTransform: 'uppercase', marginBottom: 16 }}>
            Zones FC (estimation)
          </p>
          {zones.map(z => <ZoneBar key={z.name} {...z} />)}
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 8 }}>* Basé sur la distribution typique. Connectez Apple Santé pour des données précises.</p>
        </div>
      </div>

      {/* Activity list with HR */}
      <div style={{ borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: RED, textTransform: 'uppercase' }}>
            Sorties avec FC
          </p>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{withHr.length} sorties</span>
        </div>
        {withHr.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune sortie avec données FC. Connectez Strava ou importez un GPX avec FC.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px 80px', gap: 0,
              padding: '8px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }}>
              {['Sortie', 'Distance', 'Durée', 'FC moy.', 'FC max', 'Allure'].map(h => (
                <p key={h} style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</p>
              ))}
            </div>
            {withHr.map(a => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px 80px', gap: 0,
                padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <div>
                  <p style={{ ...DF, fontSize: 13, fontWeight: 700, color: 'var(--wheat)' }}>
                    {(a as any).title ?? `Course`}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(a.date)}</p>
                </div>
                <p style={{ ...DF, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{a.distance_km?.toFixed(1)} km</p>
                <p style={{ ...DF, fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmtDur(a.duration_seconds ?? 0)}</p>
                <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: RED }}>{a.heart_rate_avg} bpm</p>
                <p style={{ ...DF, fontSize: 13, fontWeight: 700, color: ORANGE }}>{a.heart_rate_max ? `${a.heart_rate_max} bpm` : '—'}</p>
                <p style={{ ...DF, fontSize: 13, fontWeight: 700, color: TEAL }}>
                  {a.pace_sec_per_km ? `${Math.floor(a.pace_sec_per_km / 60)}:${String(Math.round(a.pace_sec_per_km % 60)).padStart(2, '0')}/km` : '—'}
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
