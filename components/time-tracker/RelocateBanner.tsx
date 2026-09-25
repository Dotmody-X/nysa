'use client'

// Bandeau ponctuel : propose de déplacer vers Mixologue les sessions que le
// time tracker a rangées par erreur dans le calendrier iCloud principal
// (Dou&Dou). N'apparaît que s'il en reste ; une fois l'appareil vérifié à
// zéro, il ne rappelle plus iCloud.

import { useEffect, useState } from 'react'
import { ArrowRight, Check, Loader2 } from '@/components/ui/icons'
import { StickerButton } from '@/components/ui/PageTitle'
import { userKey } from '@/lib/userStore'

const DONE_KEY = 'nysa_relocate_doudou_done'
const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

type Info = { count: number; from: string; to: string }

function markDone() {
  try { localStorage.setItem(userKey(DONE_KEY), '1') } catch { /* ignore */ }
}

export function RelocateBanner() {
  const [info, setInfo]       = useState<Info | null>(null)
  const [running, setRunning] = useState(false)
  const [moved, setMoved]     = useState(0)
  const [result, setResult]   = useState<{ moved: number; failed: number } | null>(null)

  useEffect(() => {
    try { if (localStorage.getItem(userKey(DONE_KEY))) return } catch { /* ignore */ }
    fetch('/api/calendar/apple/relocate')
      .then(r => r.json())
      .then(j => {
        if (j.count > 0) setInfo({ count: j.count, from: j.from, to: j.to })
        else if (!j.skipped && !j.error) markDone()
      })
      .catch(() => {})
  }, [])

  async function relocate() {
    setRunning(true)
    let total = 0
    let failed = 0
    try {
      // La route traite un lot par appel : on enchaîne tant qu'elle avance.
      for (let i = 0; i < 20; i++) {
        const j = await fetch('/api/calendar/apple/relocate', { method: 'POST' }).then(r => r.json())
        total += j.moved ?? 0
        failed = j.failed ?? 0
        setMoved(total)
        if (!j.moved || !j.remaining) break
      }
    } catch { /* on affiche ce qui a été fait */ }
    setResult({ moved: total, failed })
    if (!failed) markDone()
    setRunning(false)
  }

  if (!info) return null

  return (
    <div className="nb-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: 'var(--bg-card)' }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        {result ? (
          <p style={{ ...DF, fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={14} /> {result.moved} session{result.moved > 1 ? 's' : ''} déplacée{result.moved > 1 ? 's' : ''} vers {info.to}
          </p>
        ) : (
          <p style={{ ...DF, fontWeight: 800, fontSize: 13 }}>
            {info.count} session{info.count > 1 ? 's' : ''} rangée{info.count > 1 ? 's' : ''} dans {info.from} par erreur
          </p>
        )}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {result
            ? result.failed
              ? `${result.failed} n'ont pas pu être déplacées, réessaie plus tard.`
              : 'Ton agenda iCloud est à jour.'
            : running
              ? `Déplacement en cours… ${moved} / ${info.count}`
              : `Le time tracker les envoyait dans ${info.from} au lieu de ${info.to}. Elles gardent leur titre et leurs horaires.`}
        </p>
      </div>
      {!result && (
        running ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <StickerButton onClick={relocate} tilt="none">
            Déplacer vers {info.to} <ArrowRight size={12} />
          </StickerButton>
        )
      )}
      {result && result.failed > 0 && !running && (
        <StickerButton onClick={() => { setResult(null); relocate() }} tilt="none">Réessayer</StickerButton>
      )}
    </div>
  )
}
