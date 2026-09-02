'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  EtiquetteGamme, EtiquetteFormat, Etiquette, EtiquetteCommande,
  EtiquetteDocument, EtiquetteDocCategorie, EtatFichier,
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
      supabase.from('etiquette_formats').select('*').order('ordre').order('contenance'),
      supabase.from('etiquettes').select('*').order('saveur'),
      supabase.from('etiquette_commandes').select('*').order('date_commande', { ascending: false, nullsFirst: false }),
      supabase.from('etiquette_commande_lignes').select('*, etiquette:etiquettes(*)'),
      supabase.from('etiquette_documents').select('*').order('categorie').order('numero'),
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
    const docsParCmd = new Map<string, EtiquetteDocument[]>()
    for (const x of (fi.data ?? []) as EtiquetteDocument[]) {
      const liste = docsParCmd.get(x.commande_id) ?? []
      liste.push(x)
      docsParCmd.set(x.commande_id, liste)
    }

    setCommandes(((c.data ?? []) as EtiquetteCommande[]).map(x => ({
      ...x,
      lignes: (lignesParCmd.get(x.id) ?? []) as EtiquetteCommande['lignes'],
      documents: docsParCmd.get(x.id) ?? [],
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

  async function modifierEtiquette(id: string, champs: Partial<Etiquette>) {
    const { error } = await supabase.from('etiquettes')
      .update({ ...champs, updated_at: new Date().toISOString() }).eq('id', id)
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
    // Liste blanche des colonnes : l'objet reçu de l'écran porte aussi ses
    // étiquettes, que PostgREST rejetterait — il n'existe pas de colonne de ce
    // nom. Un spread complet suffisait à faire échouer toute modification.
    const ligne = {
      user_id: await uid(),
      gamme_id: f.gamme_id,
      contenance: f.contenance.trim(),
      ordre: f.ordre ?? 0,
      variante: f.variante?.trim() || null,
      dimensions: f.dimensions?.trim() || null,
      specification: f.specification?.trim() || null,
      actif: f.actif ?? true,
    }
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

  /**
   * Remonte ou descend un format d'un cran dans sa gamme.
   *
   * On échange les rangs des deux voisins plutôt que de renuméroter la série :
   * une seule paire bouge, et les autres formats gardent le leur.
   */
  async function deplacerFormat(id: string, sens: -1 | 1) {
    const gamme = gammes.find(g => g.formats.some(f => f.id === id))
    if (!gamme) return { error: new Error('Format introuvable') }
    const suite = [...gamme.formats].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
    const i = suite.findIndex(f => f.id === id)
    const voisin = suite[i + sens]
    if (!voisin) return { error: null }   // déjà en bout de liste

    const [a, b] = [suite[i], voisin]
    const [ra, rb] = [a.ordre ?? 0, b.ordre ?? 0]
    // Deux rangs identiques ne s'échangent pas : on les écarte d'abord.
    const [na, nb] = ra === rb ? [rb + sens, ra] : [rb, ra]

    const r1 = await supabase.from('etiquette_formats')
      .update({ ordre: na, updated_at: new Date().toISOString() }).eq('id', a.id)
    if (r1.error) return { error: r1.error }
    const r2 = await supabase.from('etiquette_formats')
      .update({ ordre: nb, updated_at: new Date().toISOString() }).eq('id', b.id)
    if (r2.error) return { error: r2.error }

    await fetch()
    return { error: null }
  }

  // ── Gammes ────────────────────────────────────────────────────────────────

  async function enregistrerGamme(g: Partial<EtiquetteGamme> & { nom: string }) {
    // Même précaution : la gamme reçue de l'écran porte ses formats.
    const ligne = {
      user_id: await uid(),
      nom: g.nom.trim(),
      ordre: g.ordre ?? 0,
      actif: g.actif ?? true,
      notes: g.notes?.trim() || null,
    }
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
    // Liste blanche : l'objet reçu de l'écran porte aussi ses lignes et ses
    // documents, que PostgREST rejetterait. Un « delete » nommant les champs
    // à retirer a déjà lâché une fois, quand « fichiers » est devenu
    // « documents » — l'inverse ne peut pas lâcher.
    const ligne: Record<string, unknown> = { user_id: await uid() }
    for (const k of ['reference','imprimeur','contact','statut','date_commande',
                     'date_reception','dossier','notes'] as const) {
      if (k in c) ligne[k] = c[k] ?? null
    }
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

  // ── Documents : BAT, factures, bons de livraison ──────────────────────────

  /** Enregistre un document. Le PDF viendra peut-être plus tard, ou jamais. */
  async function enregistrerDocument(d: Partial<EtiquetteDocument> & { commande_id: string }) {
    const ligne = {
      user_id: await uid(),
      commande_id: d.commande_id,
      categorie: d.categorie ?? 'autre',
      numero: d.numero?.trim() || null,
      date_document: d.date_document || null,
      montant: d.montant ?? null,
      notes: d.notes?.trim() || null,
    }
    const req = d.id
      ? supabase.from('etiquette_documents').update(ligne).eq('id', d.id)
      : supabase.from('etiquette_documents').insert(ligne)
    const { error } = await req
    if (!error) await fetch()
    return { error }
  }

  async function supprimerDocument(d: EtiquetteDocument) {
    if (d.file_path) await supabase.storage.from(BUCKET).remove([d.file_path])
    const { error } = await supabase.from('etiquette_documents').delete().eq('id', d.id)
    if (!error) await fetch()
    return { error }
  }

  /** Attache un PDF à un document existant, ou en crée un si aucun n'est visé. */
  async function televerser(commandeId: string, fichier: File, categorie: EtiquetteDocCategorie, documentId?: string) {
    const u = await uid()
    const propre = fichier.name.replace(/[^\w.\-]/g, '_')
    const chemin = `${u}/${commandeId}/${Date.now()}-${propre}`
    const envoi = await supabase.storage.from(BUCKET).upload(chemin, fichier)
    if (envoi.error) return { error: envoi.error }

    const piece = {
      filename: fichier.name, file_path: chemin,
      file_size: fichier.size, file_type: fichier.type,
    }
    const { error } = documentId
      ? await supabase.from('etiquette_documents').update(piece).eq('id', documentId)
      : await supabase.from('etiquette_documents')
          .insert({ user_id: u, commande_id: commandeId, categorie, ...piece })

    if (error) {
      // Ne pas laisser un objet orphelin dans le bucket si la ligne echoue.
      await supabase.storage.from(BUCKET).remove([chemin])
      return { error }
    }
    await fetch()
    return { error: null }
  }

  /** Détache le PDF sans supprimer le document : le numéro reste. */
  async function retirerFichier(d: EtiquetteDocument) {
    if (d.file_path) await supabase.storage.from(BUCKET).remove([d.file_path])
    const { error } = await supabase.from('etiquette_documents')
      .update({ filename: null, file_path: null, file_size: null, file_type: null })
      .eq('id', d.id)
    if (!error) await fetch()
    return { error }
  }

  /** Bucket privé : URL signée d'une heure. */
  async function lien(d: EtiquetteDocument) {
    if (!d.file_path) return null
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 3600)
    return data?.signedUrl ?? null
  }

  return {
    gammes, commandes, loading, error, refetch: fetch,
    marquerEtat, modifierEtiquette, ajouterEtiquette, supprimerEtiquette,
    enregistrerFormat, supprimerFormat, deplacerFormat, enregistrerGamme, supprimerGamme,
    enregistrerCommande, supprimerCommande, ajouterLigne, retirerLigne, enregistrerQuantites,
    enregistrerDocument, supprimerDocument, televerser, retirerFichier, lien,
  }
}
