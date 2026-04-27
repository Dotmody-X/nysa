export type ThemeMode = 'dark' | 'light' | 'system' | 'custom'

export const THEME_KEY        = 'nysa-theme'
export const ACCENT_KEY       = 'nysa-accent'
export const ACCENT2_KEY      = 'nysa-accent2'

export const DEFAULT_ACCENT   = '#F2542D'
export const DEFAULT_ACCENT2  = '#F5DFBB'

export function applyTheme(mode: ThemeMode, accent = DEFAULT_ACCENT, accent2 = DEFAULT_ACCENT2) {
  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  root.style.setProperty('--accent',  accent)
  root.style.setProperty('--accent-alt', accent2)
  // Keep --fiery and --wheat aliases in sync for legacy use
  root.style.setProperty('--fiery', accent)
}

export function loadTheme() {
  if (typeof window === 'undefined') return
  const mode   = (localStorage.getItem(THEME_KEY)   as ThemeMode) ?? 'dark'
  const accent  = localStorage.getItem(ACCENT_KEY)  ?? DEFAULT_ACCENT
  const accent2 = localStorage.getItem(ACCENT2_KEY) ?? DEFAULT_ACCENT2
  applyTheme(mode, accent, accent2)
}

export function saveTheme(mode: ThemeMode, accent?: string, accent2?: string) {
  localStorage.setItem(THEME_KEY, mode)
  if (accent)  localStorage.setItem(ACCENT_KEY,  accent)
  if (accent2) localStorage.setItem(ACCENT2_KEY, accent2)
  applyTheme(
    mode,
    accent  ?? localStorage.getItem(ACCENT_KEY)  ?? DEFAULT_ACCENT,
    accent2 ?? localStorage.getItem(ACCENT2_KEY) ?? DEFAULT_ACCENT2,
  )
}
