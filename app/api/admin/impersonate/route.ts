import { NextResponse } from 'next/server'
import { getAdmin, serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

const TABLES = [
  'recipes', 'transactions', 'projects', 'tasks', 'shopping_items',
  'running_activities', 'product_prices', 'events', 'time_entries', 'health_metrics',
]

// Vue (lecture seule) des données SERVEUR d'un utilisateur — pour le support.
// NB : les données stockées dans le navigateur de l'utilisateur (inventaire,
// comptes, objectifs locaux…) ne sont pas accessibles côté serveur.
export async function GET(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  try {
    const svc = serviceClient()
    const { data: u } = await svc.auth.admin.getUserById(userId)
    const meta = (u?.user?.user_metadata ?? {}) as { display_name?: string; plan?: string }

    const counts: Record<string, number> = {}
    for (const t of TABLES) {
      const { count } = await svc.from(t).select('*', { count: 'exact', head: true }).eq('user_id', userId)
      counts[t] = count ?? 0
    }

    const pick = async (t: string, cols: string, order: string) => {
      const { data } = await svc.from(t).select(cols).eq('user_id', userId).order(order, { ascending: false }).limit(5)
      return data ?? []
    }
    const samples = {
      recipes: await pick('recipes', 'name, created_at', 'created_at'),
      transactions: await pick('transactions', 'amount, type, description, date', 'date'),
      tasks: await pick('tasks', 'title, status', 'created_at'),
    }

    return NextResponse.json({
      user: { id: u?.user?.id, email: u?.user?.email, display_name: meta.display_name ?? null, plan: meta.plan ?? null, created_at: u?.user?.created_at },
      counts, samples,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: String(e) }, { status: 500 })
  }
}
