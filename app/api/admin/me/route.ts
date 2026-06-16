import { NextResponse } from 'next/server'
import { getAdmin } from '@/lib/admin'

export const runtime = 'nodejs'

// Indique si l'utilisateur courant est admin (pour afficher le lien /admin).
export async function GET() {
  const admin = await getAdmin()
  return NextResponse.json({ isAdmin: !!admin })
}
