import { PageHeader } from '@/components/layout/PageHeader'
import { Card }        from '@/components/ui/Card'
import { Wallet }      from 'lucide-react'

export default function BudgetPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <PageHeader title="Budget" sub="Transactions · Catégories · Rapport mensuel" />
      <Card className="flex flex-col items-center justify-center py-20 gap-4">
        <Wallet size={40} style={{ color: 'var(--text-subtle)' }} />
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--wheat)' }}>Module en cours de développement</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Revenus · Dépenses · Catégories · Graphiques mensuels
          </p>
        </div>
      </Card>
    </div>
  )
}
