import { PageHeader } from '@/components/layout/PageHeader'
import { Card }        from '@/components/ui/Card'
import { ShoppingCart } from 'lucide-react'

export default function CoursesPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <PageHeader title="Courses" sub="Listes · Articles · Meal planner" />
      <Card className="flex flex-col items-center justify-center py-20 gap-4">
        <ShoppingCart size={40} style={{ color: 'var(--text-subtle)' }} />
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--wheat)' }}>Module en cours de développement</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Listes de courses · Génération depuis recettes · Open Food Facts API
          </p>
        </div>
      </Card>
    </div>
  )
}
