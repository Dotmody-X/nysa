'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Imprimante, ClientAcces } from '@/types'

export function useImprimantes() {
  const [imprimantes, setImprimantes] = useState<Imprimante[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // Le magasin rattaché arrive avec la ligne : sans lui, une imprimante
    // n'est qu'un numéro de série.
    const { data, error } = await supabase
      .from('imprimantes')
      .select('*, client:clients(id, name, ville)')
      .order('magasin', { ascending: true })
    if (error) setError(error.message)
    else setImprimantes((data ?? []) as Imprimante[])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function create(payload: Partial<Imprimante> & { magasin: string }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('imprimantes')
      .insert({ ...payload, user_id: user!.id })
      .select('*, client:clients(id, name, ville)').single()
    if (!error && data) await fetch()
    return { data, error }
  }

  async function update(id: string, payload: Partial<Imprimante>) {
    const { data, error } = await supabase
      .from('imprimantes').update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id).select('*, client:clients(id, name, ville)').single()
    if (!error && data) setImprimantes(l => l.map(x => x.id === id ? data as Imprimante : x))
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('imprimantes').delete().eq('id', id)
    if (!error) setImprimantes(l => l.filter(x => x.id !== id))
    return { error }
  }

  return { imprimantes, loading, error, create, update, remove, refetch: fetch }
}

/**
 * Identifiants d'accès d'un client, chargés à la demande.
 *
 * Volontairement séparés de `useClients` : ces données ne doivent être lues
 * que sur la fiche qui les affiche, jamais embarquées dans chaque liste de
 * clients de l'application.
 */
export function useClientAcces(clientId?: string) {
  const [acces, setAcces] = useState<ClientAcces[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    if (!clientId) { setAcces([]); return }
    setLoading(true)
    // Un client a souvent plusieurs comptes sur un meme service : E-Fumeur en
    // a trois (Lanester, Vannes, Nantes), Dj Vap de Lokili sept. D'ou une
    // liste, la ou un maybeSingle() ne renvoyait rien des qu'il y en avait
    // plus d'un.
    const { data } = await supabase
      .from('client_acces')
      .select('*')
      .eq('client_id', clientId)
      .order('service')
      .order('identifiant')
    setAcces((data as ClientAcces[]) ?? [])
    setLoading(false)
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function save(payload: Partial<ClientAcces> & { id?: string }) {
    if (!clientId) return { data: null, error: new Error('client_id requis') }
    const { data: { user } } = await supabase.auth.getUser()
    const ligne = {
      ...payload,
      client_id: clientId,
      service: payload.service?.trim() || 'mixo-label',
      user_id: user!.id,
    }
    const requete = payload.id
      ? supabase.from('client_acces').update(ligne).eq('id', payload.id)
      : supabase.from('client_acces').insert(ligne)
    const { data, error } = await requete.select().single()
    if (!error) await fetch()
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('client_acces').delete().eq('id', id)
    if (!error) setAcces(prev => prev.filter(a => a.id !== id))
    return { error }
  }

  return { acces, loading, save, remove, refetch: fetch }
}

/** Un magasin et tout ce qui lui est mis à disposition. */
export interface Magasin {
  clientId: string
  nom: string
  ville?: string
  imprimantes: Imprimante[]
  acces: ClientAcces[]
}

/**
 * Regroupe le parc par magasin plutôt que par machine.
 *
 * Un magasin apparaît dès qu'il a une imprimante **ou** un accès au site :
 * Vapland n'a jamais reçu de machine mais dispose d'un compte, et il n'y a
 * aucune raison qu'il soit absent de cet écran.
 *
 * Les deux tables sont chargées entièrement — quelques dizaines de lignes
 * chacune — puis regroupées ici. Une jointure par magasin coûterait un
 * aller-retour par fiche pour le même résultat.
 */
export function useMagasins() {
  const [magasins, setMagasins] = useState<Magasin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const [parc, comptes] = await Promise.all([
      supabase.from('imprimantes')
        .select('*, client:clients(id, name, ville)')
        .order('date_mise_a_dispo', { ascending: true }),
      supabase.from('client_acces')
        .select('*, client:clients(id, name, ville)')
        .order('service').order('identifiant'),
    ])

    if (parc.error || comptes.error) {
      setError(parc.error?.message ?? comptes.error?.message ?? null)
      setLoading(false)
      return
    }

    const par = new Map<string, Magasin>()
    const fiche = (c: { id: string; name: string; ville?: string } | null, repli: string) => {
      const id = c?.id ?? `sans-client:${repli}`
      if (!par.has(id)) {
        par.set(id, { clientId: id, nom: c?.name ?? repli, ville: c?.ville, imprimantes: [], acces: [] })
      }
      return par.get(id)!
    }

    for (const i of (parc.data ?? []) as Imprimante[]) {
      fiche(i.client ?? null, i.magasin).imprimantes.push(i)
    }
    for (const a of (comptes.data ?? []) as (ClientAcces & { client?: { id: string; name: string; ville?: string } })[]) {
      fiche(a.client ?? null, a.identifiant ?? 'compte').acces.push(a)
    }

    setMagasins([...par.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))
    setError(null)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  return { magasins, loading, error, refetch: fetch }
}
