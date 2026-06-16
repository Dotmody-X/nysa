import { NextResponse } from 'next/server'
import { getAdmin, serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

const DEFAULT = { hiddenSections: [] as string[], announcement: { text: '', active: false }, maintenance: false }

// Lecture de la config globale (admin).
export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { data } = await serviceClient().from('app_config').select('value').eq('key', 'site').maybeSingle()
    return NextResponse.json({ ...DEFAULT, ...(data?.value ?? {}) })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: String(e) }, { status: 500 })
  }
}

// Mise à jour de la config globale (admin).
export async function PUT(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await request.json()
    const value = {
      hiddenSections: Array.isArray(body.hiddenSections) ? body.hiddenSections : [],
      announcement: {
        text: String(body.announcement?.text ?? ''),
        active: !!body.announcement?.active,
      },
      maintenance: !!body.maintenance,
    }
    const { error } = await serviceClient()
      .from('app_config')
      .upsert({ key: 'site', value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, value })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: String(e) }, { status: 500 })
  }
}
