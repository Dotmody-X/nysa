'use client'
import { Suspense } from 'react'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Upload, Plus, Activity, ChevronRight, Zap, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { useHealth } from '@/hooks/useHealth'
import { PageTitle, KpiGrid, KpiCard } from '@/components/ui/PageTitle'
import { parseGpx } from '@/lib/parseGpx'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const STRAVA_ORANGE = '#FC4C02'

function fmtPace(sec: number) {
  if (!sec || sec === Infinity) return '—'
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}/km`
}
function fmtDur(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`
}

function stravaAuthUrl() {
  const clientId    = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/api/strava/callback`
  return `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all`
}

function SportPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { activities, loading, addRun, refetch } = useHealth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting]   = useState(false)
  const [syncing, setSyncing]       = useState(false)
  const [syncMsg, setSyncMsg]       = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), distance: '', duration: '', notes: '' })

  // Notification après retour OAuth
  useEffect(() => {
    const strava = searchParams.get('strava')
    if (strava === 'connected') setSyncMsg({ type: 'ok', text: 'Strava connecté ! Lance une synchronisation.' })
    if (strava === 'denied')    setSyncMsg({ type: 'err', text: 'Autorisation Strava refusée.' })
    if (strava === 'error')     setSyncMsg({ type: 'err', text: 'Erreur lors de la connexion Strava.' })
  }, [searchParams])

  async function handleStravaSync() {
    setSyncing(true); setSyncMsg(null)
    try {
      const res  = await fetch('/api/strava/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur inconnue')
      setSyncMsg({ type: 'ok', text: json.message })
      if (json.synced > 0) refetch()
    } catch (err: any) {
      setSyncMsg({ type: 'err', text: err.message })
    } finally {
      setSyncing(false)
    }
  }

  // ── Stats semaine ───────────────────────────────────────
  const weekStart = (() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); d.setHours(0, 0, 0, 0); return d
  })()
  const thisWeek   = activities.filter(a => new Date(a.date) >= weekStart)
  const totalKm    = thisWeek.reduce((s, a) => s + (a.distance_km ?? 0), 0)
  const totalSec   = thisWeek.reduce((s, a) => s + (a.duration_seconds ?? 0), 0)
  const allTimeKm  = activities.reduce((s, a) => s + (a.distance_km ?? 0), 0)
  const avgPace    = totalKm > 0 && totalSec > 0 ? totalSec / totalKm : null
  const bestRun    = activities.reduce<typeof activities[0] | null>((b, a) =>
    !b || (a.distance_km ?? 0) > (b.distance_km ?? 0) ? a : b, null)

  // ── Import GPX ──────────────────────────────────────────
  async function handleGpxFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const gpx  = parseGpx(text)
      const result = await addRun({
        title:            gpx.name,
        date:             new Date().toISOString().slice(0, 10),
        distance_km:      parseFloat(gpx.distanceKm.toFixed(2)),
        duration_seconds: gpx.durationSeconds ?? undefined,
        pace_sec_per_km:  gpx.avgPaceSecPerKm ?? undefined,
        elevation_m:      Math.round(gpx.elevationGainM),
        raw_data: {
          gpx: {
            points:        gpx.points,
            kmSplits:      gpx.kmSplits,
            elevationGain: gpx.elevationGainM,
            elevationLoss: gpx.elevationLossM,
            elevationMax:  gpx.elevationMax,
            elevationMin:  gpx.elevationMin,
          }
        },
      })
      if (result.data?.id) router.push(`/sport/${result.data.id}`)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── Ajout manuel ───────────────────────────────────────
  async function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (!form.distance) return
    const parts = form.duration.split(':').map(Number)
    const dur   = form.duration ? parts[0] * 3600 + (parts[1] || 0) * 60 : undefined
    await addRun({
      date:             form.date,
      distance_km:      parseFloat(form.distance),
      duration_seconds: dur,
      notes:            form.notes || undefined,
    })
    setShowManual(false)
    setForm({ date: new Date().toISOString().slice(0, 10), distance: '', duration: '', notes: '' })
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%' }}>
      <PageTitle
        title="Running"
        sub="Strava import · Cartes · Analyses · Objectifs"
        right={
          <div className="flex gap-2 flex-wrap">
            {/* Bouton Strava connect */}
            <a
              href={typeof window !== 'undefined' ? stravaAuthUrl() : '#'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: STRAVA_ORANGE, color: '#fff', ...DF, fontWeight: 700, fontSize: 12, textDecoration: 'none' }}
            >
              {/* Logo Strava SVG inline */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0 4 13.828h4.17"/></svg>
              Connecter
            </a>
            {/* Bouton sync */}
            <button
              onClick={handleStravaSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: syncing ? 'var(--bg-card)' : '#11686A', color: syncing ? 'var(--text-muted)' : '#F0E4CC', ...DF, fontWeight: 700, fontSize: 12, border: '1px solid var(--border)' }}
            >
              <RefreshCw size={13} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing ? 'Sync…' : 'Synchroniser'}
            </button>
            {/* Import GPX manuel */}
            <label
              className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
              style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', ...DF, fontWeight: 700, fontSize: 12, border: '1px solid var(--border)' }}
            >
              <input ref={fileRef} type="file" accept=".gpx" className="hidden" onChange={handleGpxFile} />
              {importing ? <><span>⟳</span> Import…</> : <><Upload size={13} /> GPX</>}
            </label>
            <button
              onClick={() => setShowManual(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: '#F2542D', color: '#fff', ...DF, fontWeight: 700, fontSize: 12 }}
            >
              <Plus size={13} />
            </button>
          </div>
        }
      />

      {/* Notification Strava */}
      {syncMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: syncMsg.type === 'ok' ? 'rgba(14,149,148,0.12)' : 'rgba(242,84,45,0.12)', border: `1px solid ${syncMsg.type === 'ok' ? 'rgba(14,149,148,0.3)' : 'rgba(242,84,45,0.3)'}` }}>
          {syncMsg.type === 'ok'
            ? <CheckCircle2 size={14} style={{ color: '#0E9594', flexShrink: 0 }} />
            : <AlertCircle size={14} style={{ color: '#F2542D', flexShrink: 0 }} />
          }
          <span style={{ fontSize: 12, color: syncMsg.type === 'ok' ? '#0E9594' : '#F2542D', ...DF, fontWeight: 600 }}>
            {syncMsg.text}
          </span>
          <button onClick={() => setSyncMsg(null)} style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* CSS spin */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <KpiGrid>
        <KpiCard label="Distance semaine" value={`${totalKm.toFixed(1)} km`}   sub={`${thisWeek.length} sortie${thisWeek.length > 1 ? 's' : ''}`} color="#F2542D" bg="#11686A" />
        <KpiCard label="Temps semaine"    value={totalSec > 0 ? fmtDur(totalSec) : '—'}                                                            color="#F0E4CC" bg="#11686A" />
        <KpiCard label="Allure moy."      value={avgPace ? fmtPace(avgPace) : '—'}                                                                  color="#0E9594" />
        <KpiCard label="Total all-time"   value={`${allTimeKm.toFixed(0)} km`} sub={`${activities.length} sorties`} />
      </KpiGrid>

      {showManual && (
        <form onSubmit={handleManual} className="flex gap-2 flex-wrap p-4 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-active)' }}>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 12 }} />
          <input type="number" step="0.01" value={form.distance} onChange={e => setForm(f => ({ ...f, distance: e.target.value }))} placeholder="Distance (km)" autoFocus
            style={{ flex: 1, minWidth: 120, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
          <input type="text" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="Durée (h:mm)"
            style={{ width: 120, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
          <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes…"
            style={{ flex: 2, minWidth: 160, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13 }} />
          <button type="submit" style={{ background: '#F2542D', color: '#fff', borderRadius: 8, padding: '8px 20px', ...DF, fontWeight: 700, fontSize: 12 }}>Enregistrer</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px]">
        {/* ── Colonne principale ── */}
        <div className="md:col-span-2 flex flex-col gap-[10px]">

          {/* Barres hebdomadaires */}
          <div style={{ background: '#11686A', borderRadius: 12, padding: 20 }}>
            <div className="flex items-center justify-between mb-4">
              <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F0E4CC', textTransform: 'uppercase' }}>Cette semaine</p>
              <span style={{ fontSize: 11, color: 'rgba(240,228,204,0.6)' }}>{totalKm.toFixed(1)} km · {fmtDur(totalSec)}</span>
            </div>
            <div className="flex items-end gap-2" style={{ height: 80 }}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => {
                const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1 + i)
                const iso  = d.toISOString().slice(0, 10)
                const runs = activities.filter(a => a.date === iso)
                const km   = runs.reduce((s, a) => s + (a.distance_km ?? 0), 0)
                const maxKm = Math.max(...activities.map(a => a.distance_km ?? 0), 1)
                const h    = km > 0 ? Math.max(8, (km / maxKm) * 70) : 4
                const isToday = iso === new Date().toISOString().slice(0, 10)
                return (
                  <div key={i} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                    <div style={{ width: '100%', height: h, borderRadius: 4, background: km > 0 ? '#F2542D' : 'rgba(240,228,204,0.12)' }} />
                    <span style={{ fontSize: 9, color: isToday ? '#F2542D' : 'rgba(240,228,204,0.6)', ...DF, fontWeight: isToday ? 800 : 600 }}>{day}</span>
                    {km > 0 && <span style={{ fontSize: 9, color: '#F0E4CC', ...DF, fontWeight: 700 }}>{km.toFixed(1)}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Liste des sorties */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#F2542D', textTransform: 'uppercase' }}>Dernières sorties</p>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activities.length} sorties</span>
            </div>

            {loading ? <p className="p-5 text-xs" style={{ color: 'var(--text-muted)' }}>Chargement…</p>
              : activities.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-4">
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#11686A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={24} style={{ color: '#F0E4CC' }} />
                  </div>
                  <div className="text-center">
                    <p style={{ fontSize: 13, color: 'var(--wheat)', ...DF, fontWeight: 700, marginBottom: 4 }}>Aucune sortie</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Importe un GPX Strava ou saisis manuellement</p>
                  </div>
                </div>
              ) : activities.map(a => {
                const hasGpx = !!(a.raw_data as any)?.gpx
                return (
                  <button
                    key={a.id}
                    onClick={() => router.push(`/sport/${a.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left group"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#11686A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {hasGpx ? <Zap size={18} style={{ color: '#F2542D' }} /> : <Activity size={18} style={{ color: '#F0E4CC' }} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p style={{ ...DF, fontWeight: 800, fontSize: 14, color: 'var(--wheat)', lineHeight: 1.2 }}>
                        {(a as any).title ?? `Course du ${new Date(a.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`}
                        {hasGpx && (
                          <span style={{ fontSize: 9, marginLeft: 6, padding: '2px 6px', borderRadius: 4, background: 'rgba(242,84,45,0.15)', color: '#F2542D', ...DF, fontWeight: 700 }}>
                            GPX
                          </span>
                        )}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(a.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}
                        {a.notes ? ` · ${a.notes}` : ''}
                      </p>
                    </div>

                    <div className="flex gap-5 items-center shrink-0">
                      <div className="text-right">
                        <p style={{ ...DF, fontWeight: 900, fontSize: 18, color: 'var(--wheat)', lineHeight: 1 }}>{a.distance_km?.toFixed(1)}</p>
                        <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>km</p>
                      </div>
                      {a.duration_seconds && (
                        <div className="text-right hidden md:block">
                          <p style={{ ...DF, fontWeight: 700, fontSize: 13, color: '#0E9594' }}>{fmtDur(a.duration_seconds)}</p>
                          <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>temps</p>
                        </div>
                      )}
                      {a.pace_sec_per_km && (
                        <div className="text-right hidden md:block">
                          <p style={{ ...DF, fontWeight: 700, fontSize: 13, color: '#F5DFBB' }}>{fmtPace(a.pace_sec_per_km)}</p>
                          <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>allure</p>
                        </div>
                      )}
                      {(a.elevation_m ?? 0) > 0 && (
                        <div className="text-right hidden md:block">
                          <p style={{ ...DF, fontWeight: 700, fontSize: 13, color: '#F5DFBB' }}>+{a.elevation_m}m</p>
                          <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>D+</p>
                        </div>
                      )}
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </button>
                )
              })}
          </div>
        </div>

        {/* ── Colonne droite ── */}
        <div className="flex flex-col gap-[10px]">
          <div style={{ background: '#F2542D', borderRadius: 12, padding: 20 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#1A0A0A', textTransform: 'uppercase', marginBottom: 14 }}>Objectifs</p>
            {[
              { label: 'Distance / semaine', target: 30, unit: 'km',      current: parseFloat(totalKm.toFixed(1)) },
              { label: 'Sorties / semaine',  target: 4,  unit: 'sorties', current: thisWeek.length },
            ].map(obj => {
              const pct = Math.min(100, (obj.current / obj.target) * 100)
              return (
                <div key={obj.label} className="mb-4">
                  <div className="flex justify-between mb-1.5">
                    <span style={{ fontSize: 11, color: '#1A0A0A' }}>{obj.label}</span>
                    <span style={{ ...DF, fontSize: 11, fontWeight: 800, color: '#1A0A0A' }}>
                      {obj.unit === 'km' ? obj.current.toFixed(1) : obj.current}/{obj.target} {obj.unit}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: 'rgba(0,0,0,0.2)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: '#1A0A0A', width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#0E9594', textTransform: 'uppercase', marginBottom: 12 }}>Records</p>
            {[
              { label: 'Plus longue sortie', value: bestRun ? `${bestRun.distance_km} km` : '—', sub: bestRun ? new Date(bestRun.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '' },
              { label: 'Total all-time',      value: `${allTimeKm.toFixed(0)} km`,                sub: `${activities.length} sorties` },
              { label: 'Moy. / sortie',       value: activities.length ? `${(allTimeKm / activities.length).toFixed(1)} km` : '—', sub: '' },
            ].map(stat => (
              <div key={stat.label} className="flex items-start justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</span>
                  {stat.sub && <p style={{ fontSize: 9, color: 'var(--text-subtle)', marginTop: 1 }}>{stat.sub}</p>}
                </div>
                <span style={{ ...DF, fontWeight: 800, fontSize: 14, color: 'var(--wheat)' }}>{stat.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#11686A', borderRadius: 12, padding: 16 }}>
            <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(240,228,204,0.6)', textTransform: 'uppercase', marginBottom: 8 }}>Total général</p>
            <p style={{ ...DF, fontWeight: 900, fontSize: 40, color: '#F2542D', lineHeight: 1 }}>{allTimeKm.toFixed(1)}</p>
            <p style={{ fontSize: 11, color: 'rgba(240,228,204,0.6)', marginTop: 2, marginBottom: 12 }}>kilomètres courus</p>
            <p style={{ ...DF, fontWeight: 700, fontSize: 20, color: '#F0E4CC' }}>
              {fmtDur(activities.reduce((s, a) => s + (a.duration_seconds ?? 0), 0))}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(240,228,204,0.6)', marginTop: 2 }}>de temps total</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SportPage() {
  return (
    <Suspense fallback={null}>
      <SportPageInner />
    </Suspense>
  )
}
