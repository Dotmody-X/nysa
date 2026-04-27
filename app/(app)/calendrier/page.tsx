import { PageHeader } from '@/components/layout/PageHeader'
import { Card }        from '@/components/ui/Card'
import { Calendar }    from 'lucide-react'

export default function CalendrierPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">
      <PageHeader title="Calendrier" sub="Vue semaine · Événements · Planning" />
      <Card className="flex flex-col items-center justify-center py-20 gap-4">
        <Calendar size={40} style={{ color: 'var(--text-subtle)' }} />
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: 'var(--wheat)' }}>Module en cours de développement</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Grille semaine · Événements Supabase · Intégration Google Calendar
          </p>
        </div>
      </Card>
    </div>
  )
}
