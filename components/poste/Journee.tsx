'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { Calendar, CheckSquare, Sun, Sparkles, Loader2 } from '@/components/ui/icons'
import { useCalendar } from '@/hooks/useCalendar'
import { useTasks } from '@/hooks/useTasks'
import { useDigests } from '@/hooks/useDigests'
import { useProjects } from '@/hooks/useProjects'
import type { useAgentRequests } from '@/hooks/useAgentRequests'
import { questionPreparation, salonDuGroupe } from '@/lib/poste/actions'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { priorityColor } from '@/lib/digestStyle'
import { DF, WHEAT, panneau, titrePanneau, fmtHeure, boutonDiscret } from './ui'

const cle = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Cinq minutes avant un rendez-vous, Claude fait le point dans Discord — une fois par rendez-vous. */
const AVANCE_MS = 5 * 60_000
const dejaPrepare = (id: string) => { try { return localStorage.getItem(`poste:prepare:${id}`) === '1' } catch { return false } }
const marquerPrepare = (id: string) => { try { localStorage.setItem(`poste:prepare:${id}`, '1') } catch { /* rien */ } }

/**
 * La journée : la phrase du brief du matin, les rendez-vous d'aujourd'hui
 * (Realtime, comme le time tracker) avec « Prépare-moi », et ce qui est dû
 * aujourd'hui ou en retard.
 */
export function Journee({ demandes }: { demandes: ReturnType<typeof useAgentRequests> }) {
  const { debut, fin, aujourdhui } = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0)
    const f = new Date(d); f.setDate(f.getDate() + 1)
    return { debut: d, fin: f, aujourdhui: cle(d) }
  }, [])
  const { events } = useCalendar(debut, fin)
  const { tasks, toggle, refetch } = useTasks()
  const { latestBrief } = useDigests(['brief'])
  const { projects } = useProjects()
  useRealtimeTable('tasks', refetch)
  const [prepEnCours, setPrepEnCours] = useState<string | null>(null)

  /** « Prépare-moi » : Claude fait le point dans le salon de la marque du rendez-vous. */
  const preparer = useCallback(async (ev: (typeof events)[number]) => {
    if (prepEnCours) return
    setPrepEnCours(ev.id)
    try {
      const projet = ev.project_id ? projects.find(p => p.id === ev.project_id) : undefined
      const salon = salonDuGroupe(projet?.groupe ?? ev.category ?? null)
      await demandes.ask(questionPreparation(ev.title, ev.all_day ? null : fmtHeure(ev.start_at), ev.location ?? null, ev.description ?? null, projet?.name ?? null), {
        deliver: 'discord', channel: salon, event: ev.id, action: `prepare:${ev.id}`,
      })
      marquerPrepare(ev.id)
    } finally { setPrepEnCours(null) }
  }, [demandes, projects, prepEnCours])

  // Le poste est allumé toute la journée : c'est lui qui déclenche, cinq minutes avant.
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now()
      for (const ev of events) {
        if (ev.all_day || dejaPrepare(ev.id)) continue
        const debut = new Date(ev.start_at).getTime()
        if (debut - now <= AVANCE_MS && debut - now > -60_000) { marquerPrepare(ev.id); void preparer(ev) }
      }
    }, 30_000)
    return () => clearInterval(t)
  }, [events, preparer])

  const maintenant = Date.now()
  const rdv = useMemo(() => [...events].sort((a, b) => a.start_at.localeCompare(b.start_at)), [events])
  const dues = useMemo(() => tasks
    .filter(t => t.status !== 'done' && t.due_date && t.due_date <= aujourdhui)
    .sort((a, b) => (a.due_date! < b.due_date! ? -1 : a.due_date! > b.due_date! ? 1 : 0))
    .slice(0, 8), [tasks, aujourdhui])

  const headline = latestBrief?.payload?.headline

  return (
    <section style={panneau()}>
      <div style={{ padding: '10px 16px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sun size={13} style={{ color: 'var(--azul)' }} />
        <span style={titrePanneau}>La journée</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '0 16px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {headline && (
          <p style={{ fontSize: 11.5, color: WHEAT, lineHeight: 1.4, fontWeight: 500, padding: '6px 10px', borderLeft: '6px solid var(--azul)', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {headline}
          </p>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
            <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Rendez-vous</span>
          </div>
          {rdv.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rien au calendrier.</p>
          ) : rdv.map(ev => {
            const passe = new Date(ev.end_at).getTime() < maintenant
            const prepare = dejaPrepare(ev.id)
            return (
              <div key={ev.id} style={{ display: 'flex', gap: 10, padding: '3px 0', opacity: passe ? 0.5 : 1, alignItems: 'center' }}>
                <span style={{ ...DF, fontSize: 12, fontWeight: 900, color: ev.color || 'var(--azul)', minWidth: 44, fontVariantNumeric: 'tabular-nums' }}>
                  {ev.all_day ? 'Jour' : fmtHeure(ev.start_at)}
                </span>
                <span style={{ fontSize: 12.5, color: WHEAT, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                {!passe && (
                  <button className="nb-press" onClick={() => preparer(ev)} disabled={Boolean(prepEnCours)} title="Claude fait le point dans Discord"
                    style={boutonDiscret({ minHeight: 28, padding: '4px 8px', fontSize: 9.5, color: prepare ? 'var(--text-muted)' : 'var(--azul)' })}>
                    {prepEnCours === ev.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} {prepare ? 'Refaire' : 'Prépare-moi'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <CheckSquare size={12} style={{ color: 'var(--text-muted)' }} />
            <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>À faire aujourd’hui</span>
          </div>
          {dues.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rien d’échu. Bonne journée.</p>
          ) : dues.map(t => {
            const retard = t.due_date! < aujourdhui
            return (
              <button key={t.id} onClick={() => toggle(t.id, t.status)} title="Marquer fait"
                style={{ display: 'flex', gap: 9, alignItems: 'flex-start', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '3px 0', cursor: 'pointer' }}>
                <span style={{ width: 14, height: 14, border: '2px solid var(--ink)', borderRadius: 3, marginTop: 2, flexShrink: 0, background: 'var(--bg)' }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12.5, color: WHEAT, display: 'block', lineHeight: 1.35 }}>{t.title}</span>
                  <span style={{ ...DF, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: retard ? 'var(--accent-brand)' : priorityColor(t.priority) }}>
                    {retard ? `en retard · ${t.due_date}` : t.priority}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
