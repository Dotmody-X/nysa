import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { PWA } from '@/components/PWA'
import { Analytics } from '@vercel/analytics/next'

// Display caractériel (néo-brutalisme) — exposé sous --font-saira pour
// rester compatible avec le mapping --font-display de globals.css.
const saira = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-saira',
  display: 'swap',
})

const sora = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NYSA — Focus. Plan. Progress.',
  description: 'Ton dashboard personnel tout-en-un.',
  applicationName: 'NYSA',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'NYSA' },
}

export const viewport: Viewport = {
  themeColor: '#f5f1ed',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" data-theme="system" className={`${saira.variable} ${sora.variable} h-full`}>
      <body className="h-full antialiased" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <ThemeProvider>{children}</ThemeProvider>
        <PWA />
        <Analytics />
      </body>
    </html>
  )
}
