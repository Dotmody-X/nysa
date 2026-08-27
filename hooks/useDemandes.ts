'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Demande, DemandeFichier, FichierCategorie } from '@/types'

const BUCKET = 'demandes'

/** Un client et toutes ses demandes, avec le temps qu'on y a passé. */
export interface DossierClient {
  clientId: string | null
  nom: string
  ville?: string
  demandes: Demande[]
  /** Somme des chronomètres rattachés à ce client, en secondes. */
  secondes: number
}

const CHAMPS =
  '*, client:clients(id, name, ville), task:tasks(id, title, status), project:projects(id, name)'

export function useDemandes() {
  const [dossiers, setDossiers] = useState<DossierClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    // Le temps ne se stocke pas ici : il vit dans time_entries, qui porte déjà
    // client_id. On l'agrège à la lecture plutôt que de le dupliquer — un total
    // recopié est un total qui se désynchronise.
    const [dem, temps, fich] = await Promise.all([
      supabase.from('demandes').select(CHAMPS).order('date_demande', { ascending: false, nullsFirst: false }),
      supabase.from('time_entries').select('client_id, duration_seconds').not('client_id', 'is', null),
      supabase.from('demande_fichiers').select('*').order('created_at'),
    ])

    if (dem.error || temps.error || fich.error) {
      setError(dem.error?.message ?? temps.error?.message ?? fich.error?.message ?? null)
      setLoading(false)
      return
    }

    const parDemande = new Map<string, DemandeFichier[]>()
    for (const f of (fich.data ?? []) as DemandeFichier[]) {
      const l = parDemande.get(f.demande_id) ?? []
      l.push(f)
      parDemande.set(f.demande_id, l)
    }

    const secondesParClient = new Map<string, number>()
    for (const t of (temps.data ?? []) as { client_id: string; duration_seconds: number | null }[]) {
      secondesParClient.set(t.client_id, (secondesParClient.get(t.client_id) ?? 0) + (t.duration_seconds ?? 0))
    }

    const par = new Map<string, DossierClient>()
    for (const d of (dem.data ?? []) as Demande[]) {
      // Les demandes sans client restent visibles, regroupées à part : le
      // dossier Shop contient aussi du travail interne (vidéos, rendus,
      // gabarits) qui n'appartient à aucun magasin.
      const cle = d.client_id ?? '__sans_client__'
      if (!par.has(cle)) {
        par.set(cle, {
          clientId: d.client_id ?? null,
          nom: d.client?.name ?? 'Sans client',
          ville: d.client?.ville,
          demandes: [],
          secondes: d.client_id ? (secondesParClient.get(d.client_id) ?? 0) : 0,
        })
      }
      par.get(cle)!.demandes.push({ ...d, fichiers: parDemande.get(d.id) ?? [] })
    }

    const liste = [...par.values()].sort((a, b) => {
      if (!a.clientId) return 1
      if (!b.clientId) return -1
      return a.nom.localeCompare(b.nom, 'fr')
    })
    setDossiers(liste)
    setError(null)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function create(payload: Partial<Demande> & { titre: string }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('demandes').insert({ ...payload, user_id: user!.id }).select(CHAMPS).single()
    if (!error) await fetch()
    return { data, error }
  }

  async function update(id: string, payload: Partial<Demande>) {
    const { data, error } = await supabase
      .from('demandes')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id).select(CHAMPS).single()
    if (!error) await fetch()
    return { data, error }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('demandes').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  /** Téléverse un fichier et l'enregistre. Le chemin porte l'isolation : {user}/{demande}/{nom}. */
  async function televerser(demandeId: string, fichier: File, categorie: FichierCategorie) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Session expirée') }

    const propre = fichier.name.replace(/[^\w.\-]/g, '_')
    const chemin = `${user.id}/${demandeId}/${Date.now()}-${propre}`

    const envoi = await supabase.storage.from(BUCKET).upload(chemin, fichier, { upsert: false })
    if (envoi.error) return { error: envoi.error }

    const { error } = await supabase.from('demande_fichiers').insert({
      user_id: user.id, demande_id: demandeId, categorie,
      filename: fichier.name, file_path: chemin,
      file_size: fichier.size, file_type: fichier.type,
    })
    if (error) {
      // Ne pas laisser un objet orphelin dans le bucket si la ligne échoue.
      await supabase.storage.from(BUCKET).remove([chemin])
      return { error }
    }
    await fetch()
    return { error: null }
  }

  async function supprimerFichier(f: DemandeFichier) {
    await supabase.storage.from(BUCKET).remove([f.file_path])
    const { error } = await supabase.from('demande_fichiers').delete().eq('id', f.id)
    if (!error) await fetch()
    return { error }
  }

  /** Le bucket est privé : on ouvre par URL signée, valable une heure. */
  async function lien(f: DemandeFichier): Promise<string | null> {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(f.file_path, 3600)
    return data?.signedUrl ?? null
  }

  return { dossiers, loading, error, create, update, remove, televerser, supprimerFichier, lien, refetch: fetch }
}
