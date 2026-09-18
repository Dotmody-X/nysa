'use client'

import { useState, type FormEvent } from 'react'
import { PenLine, List, Radar, Calendar, Barcode, Home, Link2, Zap } from '@/components/ui/icons'
import { useDailyNote } from '@/hooks/useDailyNote'
import { DF, WHEAT, panneau, titrePanneau, boutonDiscret } from './ui'

const LIENS = [
  { href: '/brief', label: 'Brief', Icon: List },
  { href: '/calendrier', label: 'Calendrier', Icon: Calendar },
  { href: '/etiquettes', label: 'Étiquettes', Icon: Barcode },
  { href: '/radar', label: 'Radar', Icon: Radar },
  { href: '/', label: 'Nysa', Icon: Home },
]

const WEBMAILS = [
  { href: 'https://pro1.mail.ovh.net/owa/', label: 'Mail Mixo' },
  { href: 'https://mail.ovh.net/', label: 'Mail Aeterna' },
]

/**
 * Les raccourcis : une note jetée dans la journée (elle atterrit dans « Notes
 * du jour » du Brief, que le débrief du soir relit), les onglets qu'on ouvre
 * le plus, les deux webmails.
 */
export function Raccourcis() {
  const { content, setContent, saving } = useDailyNote()
  const [note, setNote] = useState('')

  function noter(e: FormEvent) {
    e.preventDefault()
    const t = note.trim()
    if (!t) return
    const heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    setContent(`${content.trimEnd()}${content.trim() ? '\n' : ''}- ${heure} · ${t}`)
    setNote('')
  }

  return (
    <section style={panneau()}>
      <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={13} style={{ color: 'var(--azul)' }} />
        <span style={titrePanneau}>Raccourcis</span>
        <span style={{ flex: 1 }} />
        {saving && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>enregistrement…</span>}
      </div>

      <form onSubmit={noter} style={{ padding: '0 16px 10px', display: 'flex', gap: 6 }}>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note du jour…" aria-label="Note du jour"
          style={{ flex: 1, minWidth: 0, background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', minHeight: 36, color: WHEAT, fontSize: 12.5 }} />
        <button type="submit" className="nb-press" disabled={!note.trim()} style={boutonDiscret({ color: WHEAT })} aria-label="Noter"><PenLine size={12} /></button>
      </form>

      <div style={{ padding: '0 16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {LIENS.map(({ href, label, Icon }) => (
          <a key={href} href={href} style={{ ...boutonDiscret({ color: WHEAT, justifyContent: 'flex-start' }), textDecoration: 'none' }}>
            <Icon size={12} style={{ color: 'var(--azul)' }} /> {label}
          </a>
        ))}
        {WEBMAILS.map(({ href, label }) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer" style={{ ...boutonDiscret({ justifyContent: 'flex-start' }), textDecoration: 'none' }}>
            <Link2 size={12} /> {label}
          </a>
        ))}
      </div>
      <p style={{ ...DF, padding: '0 16px 10px', fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
        Une note part dans le Brief, le débrief du soir la relit.
      </p>
    </section>
  )
}
