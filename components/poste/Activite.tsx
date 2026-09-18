'use client'

import { useEffect, useMemo, useState } from 'react'
import { Play, Square, Clock, Pause } from '@/components/ui/icons'
import { useTimeEntries } from '@/hooks/useTimeEntries'
import { useProjects } from '@/hooks/useProjects'
import type { TimeEntry, Project } from '@/types'
import { DF, WHEAT, panneau, titrePanneau, bouton, boutonDiscret, fmtDuree, fmtHeure } from './ui'

type Entree = TimeEntry & { projects?: { name: string; color: string } | null }

/**
 * L'activité en cours : le chronomètre en grand, l'arrêt, et les projets
 * récents en un bouton pour repartir. Le hook est en Realtime : un
 * « j'arrête » dit à Claude dans Discord s'arrête ici aussi.
 */
export function Activite() {
  const { entries, start, stop } = useTimeEntries()
  const { activeProjects } = useProjects()
  const [tick, setTick] = useState(Date.now())
  const [enCours, setEnCours] = useState(false)
  /** Ce qu'on a mis en pause : le même projet et la même description, prêts à repartir. */
  const [pause, setPause] = useState<{ projet: Project; description: string; depuis: number } | null>(null)

  const running = entries.find(e => !e.ended_at) as Entree | undefined

  useEffect(() => {
    if (!running && !pause) return
    const t = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running, pause])

  const ecoule = running ? Math.floor((tick - new Date(running.started_at).getTime()) / 1000) : 0

  // Les projets sur lesquels on a travaillé récemment, dans l'ordre, puis les autres actifs.
  const recents = useMemo(() => {
    const vus = new Map<string, { projet: Project; description: string }>()
    for (const e of entries as Entree[]) {
      if (!e.project_id || vus.has(e.project_id)) continue
      const projet = activeProjects.find(p => p.id === e.project_id)
      if (projet) vus.set(e.project_id, { projet, description: e.description ?? '' })
    }
    for (const p of activeProjects) if (!vus.has(p.id) && vus.size < 6) vus.set(p.id, { projet: p, description: '' })
    return [...vus.values()].slice(0, 6)
  }, [entries, activeProjects])

  const aujourdhui = useMemo(() => {
    const debut = new Date(); debut.setHours(0, 0, 0, 0)
    return (entries as Entree[])
      .filter(e => new Date(e.started_at) >= debut)
      .reduce((acc, e) => acc + (e.ended_at ? (e.duration_seconds ?? 0) : Math.floor((tick - new Date(e.started_at).getTime()) / 1000)), 0)
  }, [entries, tick])

  async function arreter() {
    if (!running || enCours) return
    setEnCours(true)
    try { await stop(running.id, running.started_at); setPause(null) } finally { setEnCours(false) }
  }

  /** Pause : le compteur s'arrête, mais on garde de quoi repartir d'un geste. */
  async function mettreEnPause() {
    if (!running || enCours) return
    const projet = activeProjects.find(p => p.id === running.project_id)
    setEnCours(true)
    try {
      await stop(running.id, running.started_at)
      if (projet) setPause({ projet, description: running.description ?? '', depuis: Date.now() })
    } finally { setEnCours(false) }
  }

  async function demarrer(projet: Project, description: string) {
    if (enCours) return
    setEnCours(true)
    try {
      if (running) await stop(running.id, running.started_at)
      await start(projet.id, description || projet.name)
      setPause(null)
    } finally { setEnCours(false) }
  }

  const couleur = running?.projects?.color || pause?.projet.color || 'var(--azul)'

  return (
    <section style={panneau()}>
      <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock size={13} style={{ color: 'var(--azul)' }} />
        <span style={titrePanneau}>Activité</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>{fmtDuree(aujourdhui)} aujourd’hui</span>
      </div>

      {/* Le chronomètre, avec la couleur du projet en tranche */}
      <div style={{ margin: '12px 16px 0', padding: '14px 16px', border: '2px solid var(--ink)', borderRadius: 'var(--radius-md)', borderLeft: `10px solid ${couleur}`, background: 'var(--bg)' }}>
        {running ? (
          <>
            <div style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {running.projects?.name ?? 'Sans projet'} · depuis {fmtHeure(running.started_at)}
            </div>
            <div style={{ ...DF, fontSize: 46, fontWeight: 900, lineHeight: 1.05, color: WHEAT, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>
              {fmtDuree(ecoule)}
            </div>
            <div style={{ fontSize: 13, color: WHEAT, marginTop: 4, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {running.description || '—'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="nb-press" onClick={mettreEnPause} disabled={enCours} style={{ ...bouton('var(--bg-input)', WHEAT), flex: 1 }}>
                <Pause size={13} /> Pause
              </button>
              <button className="nb-press" onClick={arreter} disabled={enCours} style={{ ...bouton('var(--accent-brand)'), flex: 1 }}>
                <Square size={13} /> Arrêter
              </button>
            </div>
          </>
        ) : pause ? (
          <>
            <div style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              En pause · {pause.projet.name}
            </div>
            <div style={{ ...DF, fontSize: 30, fontWeight: 900, color: 'var(--text-muted)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {fmtDuree(Math.floor((tick - pause.depuis) / 1000))}
            </div>
            <div style={{ fontSize: 13, color: WHEAT, marginTop: 4, opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pause.description || '—'}</div>
            <button className="nb-press" onClick={() => demarrer(pause.projet, pause.description)} disabled={enCours} style={{ ...bouton(pause.projet.color || 'var(--azul)'), marginTop: 12, width: '100%' }}>
              <Play size={13} /> Reprendre
            </button>
          </>
        ) : (
          <>
            <div style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Rien en cours</div>
            <div style={{ ...DF, fontSize: 30, fontWeight: 900, color: 'var(--text-muted)', marginTop: 4 }}>0:00</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Choisis un projet ci-dessous pour lancer le chrono.</div>
          </>
        )}
      </div>

      {/* Repartir en un geste */}
      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', minHeight: 0 }}>
        <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Reprendre</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {recents.map(({ projet, description }) => (
            <button key={projet.id} className="nb-press" disabled={enCours || running?.project_id === projet.id}
              onClick={() => demarrer(projet, description)}
              title={description || projet.name}
              style={{ ...boutonDiscret({ minHeight: 44, justifyContent: 'flex-start', textTransform: 'none', letterSpacing: 0, fontSize: 12.5, color: WHEAT, opacity: running?.project_id === projet.id ? 0.45 : 1 }) }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: projet.color, border: '1.5px solid var(--ink)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{projet.name}</span>
              <Play size={11} style={{ marginLeft: 'auto', color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          ))}
          {recents.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucun projet actif.</span>}
        </div>
      </div>
    </section>
  )
}
