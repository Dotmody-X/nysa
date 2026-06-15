// Export / suppression des données utilisateur (réglages → Données).

import { createClient } from '@/lib/supabase/client'

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

const stamp = () => new Date().toISOString().slice(0, 10)

const EXPORT_TABLES = [
  'tasks', 'time_entries', 'transactions', 'budget_categories', 'product_prices',
  'running_activities', 'health_metrics', 'recipes', 'shopping_lists', 'shopping_items',
  'projects', 'events',
]

/** Export complet (JSON) de toutes les tables de l'utilisateur. */
export async function exportAllJson(): Promise<void> {
  const supabase = createClient()
  const out: Record<string, unknown> = { app: 'NYSA', exported_at: new Date().toISOString() }
  for (const t of EXPORT_TABLES) {
    const { data } = await supabase.from(t).select('*')
    out[t] = data ?? []
  }
  download(`nysa-export-${stamp()}.json`, JSON.stringify(out, null, 2), 'application/json')
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => {
    if (v == null) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
}

/** Export des tâches en CSV. */
export async function exportTasksCsv(): Promise<void> {
  const { data } = await createClient().from('tasks').select('*')
  download(`nysa-taches-${stamp()}.csv`, toCsv((data ?? []) as Record<string, unknown>[]), 'text/csv;charset=utf-8')
}

/** Export des finances en CSV (aplati, lisible Excel). */
export async function exportFinancesCsv(): Promise<void> {
  const { data } = await createClient().from('transactions').select('*, budget_categories(name)')
  const rows = (data ?? []).map((t: Record<string, unknown>) => ({
    date: t.date, type: t.type, montant: t.amount,
    categorie: (t.budget_categories as { name?: string } | null)?.name ?? '',
    description: t.description ?? '', compte: t.account ?? '',
  }))
  download(`nysa-finances-${stamp()}.csv`, toCsv(rows), 'text/csv;charset=utf-8')
}

/** Supprime toutes les données utilisateur (irréversible). */
export async function deleteAllData(): Promise<void> {
  const supabase = createClient()
  const sentinel = '00000000-0000-0000-0000-000000000000'
  const tables = [
    'tasks', 'time_entries', 'transactions', 'running_activities', 'health_metrics',
    'recipes', 'shopping_items', 'shopping_lists', 'product_prices', 'events', 'projects',
  ]
  for (const t of tables) {
    await supabase.from(t).delete().neq('id', sentinel)
  }
}
