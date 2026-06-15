import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { ClientOnly } from '@/components/ClientOnly'
import { CommandPalette } from '@/components/CommandPalette'
import { ExpiryNotifier } from '@/components/ExpiryNotifier'
import { AuthSync } from '@/components/AuthSync'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <ClientOnly>{children}</ClientOnly>
      </main>
      <MobileNav />
      <CommandPalette />
      <ExpiryNotifier />
      <AuthSync />
    </div>
  )
}
