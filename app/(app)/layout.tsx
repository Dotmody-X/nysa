import { Sidebar }   from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content — padding-bottom on mobile for bottom nav */}
      <main className="flex-1 overflow-y-auto pb-0 md:pb-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
