'use client'

import { useEffect } from 'react'
import { IconContext } from '@phosphor-icons/react'
import { loadTheme } from '@/lib/theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { loadTheme() }, [])
  // Poids "bold" par défaut pour toutes les icônes Phosphor (néo-brutalisme)
  return (
    <IconContext.Provider value={{ weight: 'bold' }}>
      {children}
    </IconContext.Provider>
  )
}
