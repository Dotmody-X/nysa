'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  EtiquetteGamme, EtiquetteFormat, Etiquette, EtiquetteCommande,
  EtiquetteFichier, EtiquetteFichierCategorie, EtatFichier,
} from '@/types'

const BUCKET = 'etiquettes'

/** Une gamme, ses formats, et les étiquettes de chaque format. */
export interface GammeGarnie extends EtiquetteGamme {
  formats: (EtiquetteFormat & { etiquettes: Etiquette[] })[]
}

export function useEtiquettes() {
  const [gammes, setGammes] = useState<GammeGarnie[]>([])
  const [commandes, setCommandes] = useState<EtiquetteCommande[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const [g, f, e, c, l, fi] = await Promise.all([
      supabase.from('etiquette_gammes').select('*').order('ordre'),
      supabase.from('etiquette_formats').select('*').order('contenance'),
      supabase.from('etiquettes').select('*').order('saveur'),
      supabase.from('etiquette_commandes').select('*').order('date_commande', { ascending: false, nullsFirst: false }),
      supabase.from('etiquette_commande_lignes').select('*, etiquette:etiquettes(*)'),
      supabase.from('etiquette_fichiers').select('*').order('created_at'),
    ])

    const souci = [g, f, e, c, l, fi].find(r => r.error)?.error
    if (souci) { setError(souci.message); setLoading(false); return }

    const parFormat = new Map<string, Etiquette[]>()
    for (const x of (e.data ?? []) as Etiquette[]) {
      const liste = parFormat.get(x.format_id) ?? []
      liste.push(x)
      parFormat.set(x.format_id, liste)
    }

    const parGamme = new Map<string, (EtiquetteFormat & { etiquettes: Etiquette[] })[]>()
    for (const x of (f.data ?? []) as EtiquetteFormat[]) {
      const liste = parGamme.get(x.gamme_id) ?? []
      liste.push({ ...x, etiquettes: parFormat.get(x.id) ?? [] })
      parGamme.set(x.gamme_id, liste)
    }

    setGammes(((g.data ?? []) as EtiquetteGamme[]).map(x => ({ ...x, formats: parGamme.get(x.id) ?? [] })))

    const lignesParCmd = new Map<string, typeof l.data>()
    for (const x of (l.data ?? [])) {
      const liste = lignesParCmd.get(x.commande_id) ?? []
      liste.push(x)
      lignesParCmd.set(x.commande_id, liste)
    }
    const fichiersParCmd = new Map<string, EtiquetteFichier[]>()
    for (const x of (fi.data ?? []) as EtiquetteFichier[]) {
      const liste = fichiersParCmd.get(x.commande_id) ?? []
      liste.push(x)
      fichiersParCmd.set(x.commande_id, liste)
    }

    setCommandes(((c.data ?? []) as EtiquetteCommande[]).map(x => ({
      ...x,
      lignes: (lignesParCmd.get(x.id) ?? []) as EtiquetteCommande['lignes'],
      fichiers: fichiersParCmd.get(x.id) ?? [],
    })))
    setError(null)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch() }, [fetch])

  async function uid() {
    const { data: { user } } = await supabase.auth.getUser()
    return user!.id
  }

  // ── Étiquettes ────────────────────────────────────────────────────────────

  /**
   * Signale que le visuel a changé : l'imprimeur détient une version périmée.
   * L'étiquette repassera seule en « changement envoyé » à la confirmation
   * d'une commande qui la contient — c'est un trigger en base qui s'en charge.
   */
  async function marquerEtat(id: string, etat: EtatFichier) {
    const { error } = await supabase.from('etiquettes').update({
      etat_fichier: etat,
      date_modification: etat === 'modifie' ? new Date().toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function ajouterEtiquette(formatId: string, saveur: string) {
    const { error } = await supabase.from('etiquettes')
      .insert({ user_id: await uid(), format_id: formatId, saveur })
    if (!error) await fetch()
    return { error }
  }

  async function supprimerEtiquette(id: string) {
    const { error } = await supabase.from('etiquettes').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  // ── Formats ───────────────────────────────────────────────────────────────

  async function enregistrerFormat(f: Partial<EtiquetteFormat> & { gamme_id: string; contenance: string }) {
    const ligne = { ...f, user_id: await uid() }
    const req = f.id
      ? supabase.from('etiquette_formats').update({ ...ligne, updated_at: new Date().toISOString() }).eq('id', f.id)
      : supabase.from('etiquette_formats').insert(ligne)
    const { error } = await req
    if (!error) await fetch()
    return { error }
  }

  async function supprimerFormat(id: string) {
    const { error } = await supabase.from('etiquette_formats').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  // ── Gammes ────────────────────────────────────────────────────────────────

  async function enregistrerGamme(g: Partial<EtiquetteGamme> & { nom: string }) {
    const ligne = { ...g, user_id: await uid() }
    const req = g.id
      ? supabase.from('etiquette_gammes').update({ ...ligne, updated_at: new Date().toISOString() }).eq('id', g.id)
      : supabase.from('etiquette_gammes').insert(ligne)
    const { error } = await req
    if (!error) await fetch()
    return { error }
  }

  async function supprimerGamme(id: string) {
    const { error } = await supabase.from('etiquette_gammes').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  // ── Commandes ─────────────────────────────────────────────────────────────

  async function enregistrerCommande(c: Partial<EtiquetteCommande>) {
    const ligne = { ...c, user_id: await uid() }
    delete (ligne as Record<string, unknown>).lignes
    delete (ligne as Record<string, unknown>).fichiers
    const req = c.id
      ? supabase.from('etiquette_commandes').update({ ...ligne, updated_at: new Date().toISOString() }).eq('id', c.id)
      : supabase.from('etiquette_commandes').insert(ligne)
    const { data, error } = await req.select().single()
    if (!error) await fetch()
    return { data: data as EtiquetteCommande | null, error }
  }

  async function supprimerCommande(id: string) {
    const { error } = await supabase.from('etiquette_commandes').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  async function ajouterLigne(commandeId: string, etiquetteId: string, quantite: number) {
    const { error } = await supabase.from('etiquette_commande_lignes')
      .insert({ user_id: await uid(), commande_id: commandeId, etiquette_id: etiquetteId, quantite })
    if (!error) await fetch()
    return { error }
  }

  /**
   * Enregistre d'un coup toutes les quantités d'une grille de saisie.
   *
   * C'est la traduction du bon de commande papier : on parcourt la liste des
   * saveurs, on inscrit des nombres, on valide une fois. Une quantité remise à
   * zéro retire sa ligne — sur le papier, on rature.
   */
  async function enregistrerQuantites(commandeId: string, quantites: Record<string, number>) {
    const u = await uid()
    const aPoser = Object.entries(quantites).filter(([, q]) => q > 0)
    const aRetirer = Object.entries(quantites).filter(([, q]) => !q).map(([id]) => id)

    if (aRetirer.length) {
      const { error } = await supabase.from('etiquette_commande_lignes')
        .delete().eq('commande_id', commandeId).in('etiquette_id', aRetirer)
      if (error) return { error }
    }
    if (aPoser.length) {
      const { error } = await supabase.from('etiquette_commande_lignes').upsert(
        aPoser.map(([etiquette_id, quantite]) => ({
          user_id: u, commande_id: commandeId, etiquette_id, quantite,
        })),
        { onConflict: 'commande_id,etiquette_id' },
      )
      if (error) return { error }
    }
    await fetch()
    return { error: null }
  }

  async function retirerLigne(id: string) {
    const { error } = await supabase.from('etiquette_commande_lignes').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  // ── BAT et factures ───────────────────────────────────────────────────────

  async function televerser(commandeId: string, fichier: File, categorie: EtiquetteFichierCategorie) {
    const u = await uid()
    const propre = fichier.name.replace(/[^\w.\-]/g, '_')
    const chemin = `${u}/${commandeId}/${Date.now()}-${propre}`
    const envoi = await supabase.storage.from(BUCKET).upload(chemin, fichier)
    if (envoi.error) return { error: envoi.error }
    const { error } = await supabase.from('etiquette_fichiers').insert({
      user_id: u, commande_id: commandeId, categorie,
      filename: fichier.name, file_path: chemin,
      file_size: fichier.size, file_type: fichier.type,
    })
    if (error) {
      await supabase.storage.from(BUCKET).remove([chemin])
      return { error }
    }
    await fetch()
    return { error: null }
  }

  async function supprimerFichier(f: EtiquetteFichier) {
    await supabase.storage.from(BUCKET).remove([f.file_path])
    const { error } = await supabase.from('etiquette_fichiers').delete().eq('id', f.id)
    if (!error) await fetch()
    return { error }
  }

  /** Bucket privé : URL signée d'une heure. */
  async function lien(f: EtiquetteFichier) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(f.file_path, 3600)
    return data?.signedUrl ?? null
  }

  return {
    gammes, commandes, loading, error, refetch: fetch,
    marquerEtat, ajouterEtiquette, supprimerEtiquette,
    enregistrerFormat, supprimerFormat, enregistrerGamme, supprimerGamme,
    enregistrerCommande, supprimerCommande, ajouterLigne, retirerLigne, enregistrerQuantites,
    televerser, supprimerFichier, lien,
  }
}
