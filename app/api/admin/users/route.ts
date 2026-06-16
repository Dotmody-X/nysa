import { NextResponse } from 'next/server'
import { getAdmin, serviceClient } from '@/lib/admin'

export const runtime = 'nodejs'

// Liste des comptes.
export async function GET() {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { data } = await serviceClient().auth.admin.listUsers({ perPage: 1000 })
    const users = (data?.users ?? []).map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      confirmed: !!u.email_confirmed_at,
      display_name: (u.user_metadata as { display_name?: string } | null)?.display_name ?? null,
    }))
    return NextResponse.json({ users })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: String(e) }, { status: 500 })
  }
}

// Suppression d'un compte (et de ses données via ON DELETE CASCADE).
export async function DELETE(request: Request) {
  const admin = await getAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  if (id === admin.id) return NextResponse.json({ error: 'Impossible de supprimer son propre compte admin' }, { status: 400 })
  try {
    const { error } = await serviceClient().auth.admin.deleteUser(id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: String(e) }, { status: 500 })
  }
}
