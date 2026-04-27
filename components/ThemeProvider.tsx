'use client'

import { useEffect } from 'react'
import { loadTheme } from '@/lib/theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { loadTheme() }, [])
  return <>{children}</>
}
