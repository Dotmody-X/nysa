'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export type ThemeConfig = {
  accent?: string     // --accent-budget (couleur principale)
  secondary?: string  // --azul (couleur secondaire)
  ink?: string        // --ink (contours / ombres)
  bg?: string         // --bg (fond papier)
  card?: string       // --bg-card
  text?: string       // --text
  radius?: number | null // --radius-lg (px)
}

export type Plan = { id: string; name: string; price: number; features: string[] }
export type ThemePreset = { id: string; name: string; theme: ThemeConfig }

export type SiteConfig = {
  hiddenSections: string[]
  announcement: { text: string; active: boolean }
  maintenance: boolean
  theme: ThemeConfig
  themePresets: ThemePreset[]
  plans: Plan[]
}

export const DEFAULT_CONFIG: SiteConfig = {
  hiddenSections: [],
  announcement: { text: '', active: false },
  maintenance: false,
  theme: {},
  themePresets: [],
  plans: [],
}

// Mapping token de thème → variable CSS appliquée au :root
export const THEME_CSS_MAP: Record<keyof Omit<ThemeConfig, 'radius'>, string> = {
  accent: '--accent-budget', secondary: '--azul', ink: '--ink',
  bg: '--bg', card: '--bg-card', text: '--text',
}

function browser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

/** Réglages globaux du site (feature flags, annonce, maintenance), lus par tous. */
export function useAppConfig(): { config: SiteConfig; loading: boolean } {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let on = true
    ;(async () => {
      try {
        const { data } = await browser().from('app_config').select('value').eq('key', 'site').maybeSingle()
        if (on && data?.value) setConfig({ ...DEFAULT_CONFIG, ...(data.value as Partial<SiteConfig>) })
      } catch { /* table absente / non connecté → défauts */ }
      if (on) setLoading(false)
    })()
    return () => { on = false }
  }, [])
  return { config, loading }
}

/** Indique si l'utilisateur courant est administrateur (via /api/admin/me). */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    let on = true
    fetch('/api/admin/me').then(r => r.json()).then(d => { if (on) setIsAdmin(!!d.isAdmin) }).catch(() => {})
    return () => { on = false }
  }, [])
  return isAdmin
}
