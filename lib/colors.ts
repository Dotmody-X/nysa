/**
 * Theme-aware color constants
 * These use CSS variables that adapt to light/dark mode
 */

export const themeColors = {
  // Accents (fixed)
  accent: '#F2542D',          // Orange (same in all modes)
  
  // Text colors (theme-aware, use var(--)
  textPrimary: 'var(--text)',
  textMuted: 'var(--text-muted)',
  textSubtle: 'var(--text-subtle)',
  
  // Secondary colors (theme-aware)
  wheat: 'var(--wheat)',           // Light in dark, dark in light
  accentLight: 'var(--accent-light)', // F0E4CC in dark, D94020 in light
  
  // Base colors (theme-aware)
  cyan: 'var(--dark-cyan)',
  teal: 'var(--stormy-teal)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  
  // Background (theme-aware)
  bg: 'var(--bg)',
  bgCard: 'var(--bg-card)',
  bgInput: 'var(--bg-input)',
  border: 'var(--border)',
} as const

/**
 * Chart-specific colors (palette)
 * Used for data visualization - consistent across themes
 */
export const chartPalette = [
  '#F2542D',  // Orange (accent)
  '#0E9594',  // Cyan
  '#E8A838',  // Gold
  '#7C6FAF',  // Purple
  '#3ABCB8',  // Teal
  '#E46A45',  // Terracotta
  '#9B72CF',  // Lavender
  '#C45E3E',  // Brown
  '#5E9C8F',  // Sea green
  '#E8C84A',  // Yellow
] as const

/**
 * Shorthand for pages (replaces inline color defs)
 * Usage:
 * const { accent, wheat, text } = pageColors
 */
export const pageColors = {
  accent: themeColors.accent,
  accentLight: themeColors.accentLight,
  wheat: themeColors.textPrimary,
  text: themeColors.textPrimary,
  textMuted: themeColors.textMuted,
  cyan: themeColors.cyan,
  teal: themeColors.teal,
  success: themeColors.success,
  danger: themeColors.danger,
  border: themeColors.border,
} as const
