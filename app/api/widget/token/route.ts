import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabase } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * Fabrique une session Supabase dédiée au widget iOS.
 *
 * Le widget ne peut pas se connecter : il n'a ni formulaire ni navigateur. On
 * lui fabrique donc ici une session à part, à partir de celle du navigateur
 * qui appelle cette route — c'est le même mécanisme que la liaison Discord de
 * l'agent : lien magique généré côté service, échangé aussitôt contre une
 * session.
 *
 * Une session distincte et non un partage de celle du navigateur : Supabase
 * fait tourner les jetons de rafraîchissement, et deux porteurs du même jeton
 * s'invalident mutuellement au premier renouvellement.
 *
 * En POST uniquement : une route qui délivre un identifiant de longue durée
 * n'a rien à faire dans une requête que le navigateur peut précharger.
 */
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const service = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: lien, error: erreurLien } = await service.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
  })

  if (erreurLien || !lien.properties?.hashed_token) {
    return NextResponse.json(
      { error: `Génération impossible : ${erreurLien?.message ?? 'jeton absent'}` },
      { status: 500 },
    )
  }

  const anon = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: session, error: erreurEchange } = await anon.auth.verifyOtp({
    token_hash: lien.properties.hashed_token,
    type: 'magiclink',
  })

  if (erreurEchange || !session.session) {
    return NextResponse.json(
      { error: `Échange impossible : ${erreurEchange?.message ?? 'aucune session'}` },
      { status: 500 },
    )
  }

  return NextResponse.json({
    refresh_token: session.session.refresh_token,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}
