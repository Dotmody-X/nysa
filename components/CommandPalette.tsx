'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

type Dest = { label: string; href: string; emoji: string; key?: string }

// Destinations + raccourci « g <touche> »
const DESTINATIONS: Dest[] = [
  { label: 'Accueil',       href: '/',                   emoji: '🏠', key: 'h' },
  { label: 'Calendrier',    href: '/calendrier',         emoji: '📅', key: 'c' },
  { label: 'Time Tracker',  href: '/time-tracker',       emoji: '⏱', key: 't' },
  { label: 'Projets',       href: '/projets',            emoji: '📁', key: 'p' },
  { label: 'To-Do',         href: '/todo',               emoji: '✅', key: 'd' },
  { label: 'Running',       href: '/sport',              emoji: '🏃', key: 'u' },
  { label: 'Health',        href: '/health',             emoji: '❤️', key: 'e' },
  { label: 'Recettes',      href: '/recettes',           emoji: '🍽', key: 'r' },
  { label: 'Courses',       href: '/courses',            emoji: '🛒', key: 'o' },
  { label: 'Inventaire',    href: '/courses/inventaire', emoji: '📦' },
  { label: 'Budget',        href: '/budget',             emoji: '💳', key: 'b' },
  { label: 'Rapports',      href: '/rapports',           emoji: '📊' },
  { label: 'Réglages',      href: '/reglages',           emoji: '⚙️', key: 's' },
  { label: 'Profil',        href: '/compte',             emoji: '👤' },
]

const G_MAP: Record<string, string> = Object.fromEntries(
  DESTINATIONS.filter(d => d.key).map(d => [d.key as string, d.href])
)

/** Palette de commandes (Cmd/Ctrl+K) + navigation « g <touche> ». Montée au niveau app. */
export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const gPending = useRef(false)
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const results = DESTINATIONS.filter(d => d.label.toLowerCase().includes(q.trim().toLowerCase()))

  const go = useCallback((href: string) => { setOpen(false); router.push(href) }, [router])

  useEffect(() => {
    function isTyping(el: EventTarget | null) {
      const t = el as HTMLElement | null
      const tag = t?.tagName?.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || !!t?.isContentEditable
    }
    function onKey(e: KeyboardEvent) {
      // Cmd/Ctrl+K : ouvrir/fermer
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen(o => !o); return
      }
      if (e.key === 'Escape') { setOpen(false); gPending.current = false; return }
      if (open || e.metaKey || e.ctrlKey || e.altKey) return
      if (isTyping(e.target)) return

      // Séquence « g » puis touche de destination
      if (gPending.current) {
        const href = G_MAP[e.key.toLowerCase()]
        gPending.current = false
        if (gTimer.current) clearTimeout(gTimer.current)
        if (href) { e.preventDefault(); router.push(href) }
        return
      }
      if (e.key.toLowerCase() === 'g') {
        gPending.current = true
        if (gTimer.current) clearTimeout(gTimer.current)
        gTimer.current = setTimeout(() => { gPending.current = false }, 900)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, router])

  useEffect(() => {
    if (open) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 30) }
  }, [open])

  useEffect(() => { setIdx(0) }, [q])

  if (!open) return null

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[idx]) go(results[idx].href) }
  }

  return (
    <div onClick={() => setOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 520, background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', border: '2px solid var(--ink)', boxShadow: '6px 6px 0 var(--ink)', overflow: 'hidden' }}>
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onInputKey}
          placeholder="Aller à… (tape un nom, ↑↓ puis Entrée)"
          style={{ width: '100%', boxSizing: 'border-box', padding: '16px 18px', background: 'var(--bg-input)', border: 'none', borderBottom: '2px solid var(--ink)', color: 'var(--text)', fontSize: 15, outline: 'none', ...DF, fontWeight: 600 }} />
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
          {results.length === 0 && (
            <p style={{ padding: 18, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Aucune page</p>
          )}
          {results.map((d, i) => (
            <button key={d.href} onClick={() => go(d.href)} onMouseEnter={() => setIdx(i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: i === idx ? 'var(--accent-budget)' : 'transparent', color: i === idx ? 'var(--chocolate)' : 'var(--text)' }}>
              <span style={{ fontSize: 18 }}>{d.emoji}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{d.label}</span>
              {d.key && (
                <kbd style={{ ...DF, fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, border: '1.5px solid var(--ink)', background: i === idx ? 'rgba(0,0,0,0.12)' : 'var(--bg-input)', color: i === idx ? 'var(--chocolate)' : 'var(--text-muted)' }}>g {d.key}</kbd>
              )}
            </button>
          ))}
        </div>
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 14, fontSize: 9, color: 'var(--text-muted)', ...DF, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>⌘K ouvrir</span><span>↑↓ naviguer</span><span>↵ aller</span><span>esc fermer</span>
        </div>
      </div>
    </div>
  )
}
