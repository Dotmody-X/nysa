import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { UtensilsCrossed } from 'lucide-react'

export default function RecettesPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <PageHeader title="Recettes" sub="Mes recettes · Meal planner · Courses" />
      <Card className="flex flex-col items-center justify-center py-20 gap-4">
        <UtensilsCrossed size={40} style={{ color: 'var(--text-subtle)' }} />
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--wheat)' }}>Module en cours de développement</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Recettes · Ingrédients · Meal planner · Génération liste de courses
          </p>
        </div>
      </Card>
    </div>
  )
}
