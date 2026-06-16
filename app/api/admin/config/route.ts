import { NextResponse } from 'next/server'
import { getAdmin, serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

const DEFAULT = { hiddenSections: [] as string[], announcement: { text: '', active: false }, maintenance: false, theme: {}, plans: [] }

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

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
    const th = body.theme ?? {}
    const value = {
      hiddenSections: Array.isArray(body.hiddenSections) ? body.hiddenSections : [],
      announcement: {
        text: String(body.announcement?.text ?? ''),
        active: !!body.announcement?.active,
      },
      maintenance: !!body.maintenance,
      theme: {
        accent: str(th.accent), secondary: str(th.secondary), ink: str(th.ink),
        bg: str(th.bg), card: str(th.card), text: str(th.text),
        radius: typeof th.radius === 'number' ? th.radius : null,
      },
      plans: Array.isArray(body.plans) ? body.plans.map((p: Record<string, unknown>) => ({
        id: String(p.id ?? Math.random().toString(36).slice(2)),
        name: String(p.name ?? ''),
        price: Number(p.price) || 0,
        features: Array.isArray(p.features) ? (p.features as unknown[]).map(String) : [],
      })) : [],
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
