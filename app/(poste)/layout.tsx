import { ClientOnly } from '@/components/ClientOnly'
import { AuthSync } from '@/components/AuthSync'
import { ThemeInjector } from '@/components/ThemeInjector'

/**
 * Le poste n'a ni barre latérale ni navigation mobile : c'est un écran fixe,
 * plein cadre, sur l'iPad du bureau. Le proxy exige toujours une session.
 */
export default function PosteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: '100dvh', overflow: 'hidden', background: 'var(--bg)' }}>
      <ClientOnly>{children}</ClientOnly>
      <AuthSync />
      <ThemeInjector />
    </div>
  )
}
