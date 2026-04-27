'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun, Monitor, Palette, Check } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { type ThemeMode, saveTheme, THEME_KEY, ACCENT_KEY, ACCENT2_KEY, DEFAULT_ACCENT, DEFAULT_ACCENT2 } from '@/lib/theme'

const THEMES: { id: ThemeMode; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'dark',   label: 'Sombre',   desc: 'Fond noir, texte crème',         icon: Moon    },
  { id: 'light',  label: 'Clair',    desc: 'Fond blanc, texte foncé',        icon: Sun     },
  { id: 'system', label: 'Système',  desc: 'Suit le thème de ton OS',        icon: Monitor },
  { id: 'custom', label: 'Perso',    desc: 'Couleurs personnalisées',         icon: Palette },
]

const ACCENT_PRESETS = [
  { label: 'Fiery',    color: '#F2542D' },
  { label: 'Cyan',     color: '#0E9594' },
  { label: 'Violet',   color: '#7C3AED' },
  { label: 'Rose',     color: '#E11D48' },
  { label: 'Amber',    color: '#D97706' },
  { label: 'Indigo',   color: '#4F46E5' },
  { label: 'Emerald',  color: '#059669' },
  { label: 'Sky',      color: '#0284C7' },
]

export default function ReglagesPage() {
  const [activeTheme,  setActiveTheme]  = useState<ThemeMode>('dark')
  const [accent,       setAccent]       = useState(DEFAULT_ACCENT)
  const [accent2,      setAccent2]      = useState(DEFAULT_ACCENT2)
  const [saved,        setSaved]        = useState(false)

  useEffect(() => {
    setActiveTheme((localStorage.getItem(THEME_KEY) as ThemeMode) ?? 'dark')
    setAccent(localStorage.getItem(ACCENT_KEY)   ?? DEFAULT_ACCENT)
    setAccent2(localStorage.getItem(ACCENT2_KEY) ?? DEFAULT_ACCENT2)
  }, [])

  function handleTheme(t: ThemeMode) {
    setActiveTheme(t)
    saveTheme(t, accent, accent2)
  }

  function handleSave() {
    saveTheme(activeTheme, accent, accent2)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6 max-w-[720px]">
      <PageHeader title="Réglages" sub="Thème · Apparence · Préférences" />

      {/* Sélection thème */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Thème</p>
        <div className="grid grid-cols-4 gap-3">
          {THEMES.map(t => {
            const Icon    = t.icon
            const isActive = activeTheme === t.id
            return (
              <button key={t.id} onClick={() => handleTheme(t.id)}
                className="flex flex-col items-center gap-2 p-4 rounded-[10px] transition-all"
                style={{
                  background:  isActive ? 'var(--accent)' + '18' : 'var(--bg)',
                  border:      `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                <Icon size={20} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                <p className="text-xs font-semibold" style={{ color: isActive ? 'var(--wheat)' : 'var(--text-muted)' }}>{t.label}</p>
                <p className="text-[9px] text-center leading-snug" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
                {isActive && (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                    <Check size={10} color="#fff" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Couleur d'accent */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Couleur principale</p>
        <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>Utilisée pour les boutons, liens actifs, indicateurs.</p>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          {ACCENT_PRESETS.map(p => {
            const isActive = accent === p.color
            return (
              <button key={p.color}
                onClick={() => { setAccent(p.color); saveTheme(activeTheme, p.color, accent2) }}
                className="flex flex-col items-center gap-1 transition-all"
                title={p.label}>
                <div className="w-8 h-8 rounded-full transition-all"
                  style={{ background: p.color, outline: isActive ? `3px solid ${p.color}` : 'none', outlineOffset: 2 }}>
                  {isActive && <div className="w-full h-full rounded-full flex items-center justify-center"><Check size={14} color="#fff" /></div>}
                </div>
                <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{p.label}</span>
              </button>
            )
          })}
        </div>

        {/* Couleur custom */}
        <div className="flex items-center gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Couleur custom</label>
            <div className="flex items-center gap-2">
              <input type="color" value={accent} onChange={e => { setAccent(e.target.value); saveTheme(activeTheme, e.target.value, accent2) }}
                className="w-10 h-10 rounded-[6px] cursor-pointer border-0 bg-transparent" />
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{accent}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest mb-1 block" style={{ color: 'var(--text-muted)' }}>Texte / Wheat</label>
            <div className="flex items-center gap-2">
              <input type="color" value={accent2} onChange={e => { setAccent2(e.target.value); saveTheme(activeTheme, accent, e.target.value) }}
                className="w-10 h-10 rounded-[6px] cursor-pointer border-0 bg-transparent" />
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{accent2}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Aperçu</p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-[8px] text-sm font-medium" style={{ background: accent, color: '#fff' }}>Bouton primaire</div>
            <div className="px-4 py-2 rounded-[8px] text-sm font-medium" style={{ background: 'transparent', border: `1px solid ${accent}`, color: accent }}>Bouton outline</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
            <span className="text-xs" style={{ color: 'var(--wheat)' }}>Texte principal — {accent2}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Texte muted</span>
          </div>
          <div className="p-3 rounded-[8px]" style={{ background: accent + '15', border: `1px solid ${accent}33` }}>
            <p className="text-xs" style={{ color: accent }}>Item actif dans la sidebar</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave}>
          {saved ? <><Check size={13} /> Sauvegardé !</> : 'Sauvegarder'}
        </Button>
      </div>
    </div>
  )
}
