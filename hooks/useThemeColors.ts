'use client'

import { useEffect, useState } from 'react'

interface ThemeColors {
  accent: string
  accentLight: string
  text: string
  textMuted: string
  textSubtle: string
  border: string
  cyan: string
  teal: string
  wheat: string
  espresso: string
  bg: string
  bgCard: string
}

/**
 * Hook para obter cores do tema atual (dark/light/system)
 * Todas as cores mudam automaticamente com o tema
 */
export function useThemeColors(): ThemeColors {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // Detect theme on mount
    const theme = localStorage.getItem('nysa-theme') ?? 'system'
    const root = document.documentElement

    const checkDark = () => {
      if (theme === 'dark') return true
      if (theme === 'light') return false
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    setIsDark(checkDark())

    // Listen for theme changes
    const handleStorageChange = () => {
      setIsDark(checkDark())
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Return colors based on theme
  if (isDark) {
    // Dark mode colors
    return {
      accent: '#F2542D',
      accentLight: '#F5DFBB',
      text: '#F5DFBB',
      textMuted: 'rgba(245, 223, 187, 0.45)',
      textSubtle: 'rgba(245, 223, 187, 0.25)',
      border: 'rgba(245, 223, 187, 0.08)',
      cyan: '#0E9594',
      teal: '#11686A',
      wheat: '#F5DFBB',
      espresso: '#562C2C',
      bg: '#0C0C0C',
      bgCard: '#161616',
    }
  } else {
    // Light mode colors (INVERTED for readability)
    return {
      accent: '#D94020',     // Darker orange
      accentLight: '#F2542D', // Original orange
      text: '#1A1A1A',
      textMuted: '#5A5A5A',  // Darker gray
      textSubtle: '#8A8A8A', // Medium gray
      border: 'rgba(0, 0, 0, 0.15)',
      cyan: '#0A7A79',       // Darker cyan
      teal: '#086765',       // Darker teal
      wheat: '#1A1A1A',      // Dark text (not light)
      espresso: '#2A1A1A',   // Lighter brown
      bg: '#F5F4F0',
      bgCard: '#FFFFFF',
    }
  }
}
