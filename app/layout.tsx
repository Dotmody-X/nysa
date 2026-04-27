import type { Metadata } from 'next'
import { Syne, Sora } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sora',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NYSA — Focus. Plan. Progress.',
  description: 'Ton dashboard personnel tout-en-un.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${syne.variable} ${sora.variable} h-full`}>
      <body className="h-full antialiased" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
