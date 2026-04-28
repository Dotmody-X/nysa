// ============================================================
// NYSA — Calendar Cron (toutes les heures, Vercel Cron Jobs)
// GET /api/calendar/cron
// Protégé par CRON_SECRET
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { runAppleSync }              from '@/lib/caldav'

export async function GET(req: NextRequest) {
  // Vérifie le secret (Vercel envoie automatiquement Authorization: Bearer <CRON_SECRET>)
  const authHeader = req.headers.get('authorization')
  const secret     = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Utilise la service role key pour accéder à toutes les intégrations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Récupère tous les utilisateurs avec Apple Calendar connecté
  const { data: integrations, error } = await supabaseAdmin
    .from('integrations')
    .select('user_id, access_token, metadata')
    .eq('provider', 'apple_calendar')

  if (error || !integrations?.length) {
    return NextResponse.json({ synced: 0, message: 'Aucune intégration Apple Calendar' })
  }

  const results: Array<{ userId: string; added: number; removed: number; error?: string }> = []

  for (const integ of integrations) {
    const email       = integ.metadata?.email
    const appPassword = integ.access_token
    if (!email || !appPassword) continue

    const result = await runAppleSync(integ.user_id, email, appPassword, supabaseAdmin)
    results.push({ userId: integ.user_id, ...result })
  }

  const totalAdded   = results.reduce((s, r) => s + r.added, 0)
  const totalRemoved = results.reduce((s, r) => s + r.removed, 0)

  console.log(`[CRON] Apple Calendar sync: +${totalAdded} / -${totalRemoved} pour ${results.length} user(s)`)

  return NextResponse.json({
    users:   results.length,
    added:   totalAdded,
    removed: totalRemoved,
    results,
  })
}
