import { NextResponse } from 'next/server'
import { getAdmin, serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

const TABLES = [
  'recipes', 'transactions', 'projects', 'tasks', 'shopping_items',
  'running_activities', 'product_prices', 'events', 'time_entries', 'health_metrics',
]

// Statistiques globales du site (tous comptes confondus).
export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const svc = serviceClient()
    const counts: Record<string, number> = {}
    for (const t of TABLES) {
      const { count } = await svc.from(t).select('*', { count: 'exact', head: true })
      counts[t] = count ?? 0
    }
    const { data } = await svc.auth.admin.listUsers({ perPage: 1000 })
    const users = data?.users ?? []
    const recentUsers = [...users]
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 8)
      .map(u => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at }))

    return NextResponse.json({ userCount: users.length, counts, recentUsers })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: String(e) }, { status: 500 })
  }
}
