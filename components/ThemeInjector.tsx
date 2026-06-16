'use client'

import { useAppConfig, THEME_CSS_MAP, type ThemeConfig } from '@/hooks/useAppConfig'

/**
 * Applique le thème défini dans l'admin à TOUT le site, en surchargeant les
 * variables CSS au :root. Vide → aucune surcharge (le design par défaut reste).
 */
export function ThemeInjector() {
  const { config } = useAppConfig()
  const t: ThemeConfig = config.theme ?? {}

  const rules = (Object.keys(THEME_CSS_MAP) as (keyof typeof THEME_CSS_MAP)[])
    .map(k => (t[k] ? `${THEME_CSS_MAP[k]}:${t[k]};` : ''))
    .join('')
  const radius = typeof t.radius === 'number' ? `--radius-lg:${t.radius}px;--radius-xl:${t.radius + 4}px;` : ''
  // --text-rgb suit --text si surchargé (pour les rgba dérivés)
  const css = rules || radius ? `:root{${rules}${radius}}` : ''

  if (!css) return null
  return <style data-admin-theme>{css}</style>
}
