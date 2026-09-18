import type { SupabaseClient } from '@supabase/supabase-js'
import { compteDe } from '../mail/comptes.js'
import { envoyer, prenomDe } from '../mail/envoi.js'
import type { Livreur } from './worker.js'
import { log } from '../log.js'

/**
 * Les actions du poste qui ne demandent pas Claude : un geste, une suite
 * d'opérations connue d'avance. Le worker les reconnaît à `context.action`
 * et les exécute ici, sous le JWT de l'utilisateur, avant de rendre la
 * réponse dans la même ligne qu'une demande ordinaire.
 */

type Evenement = {
  id: number
  brand: string | null
  title: string | null
  external_id: string | null
  payload: {
    from?: string
    mailbox?: string
    etiquettes?: { commande_id: string; reference: string; documents: { id: string; categorie: string; filename: string }[] }
  }
}

export type ResultatAction = { reply: string; salon?: string }


/**
 * « Valider le BAT » : le mail « bon pour impression » part à l'imprimeur en
 * réponse au mail du BAT, depuis la boîte qui l'a reçu ; les documents BAT
 * portent leur date de validation ; la commande passe en production ; le
 * mail sort de l'inbox.
 */
export async function validerBat(db: SupabaseClient, ctx: Record<string, unknown>, livreur: Livreur | null): Promise<ResultatAction> {
  const eventId = Number(ctx.event_id)
  if (!eventId) throw new Error('valider_bat : event_id manquant')
  const { data, error } = await db.rpc('get_work_event', { p_id: eventId })
  if (error) throw new Error(error.message)
  const ev = data as Evenement | null
  if (!ev) throw new Error(`Mail #${eventId} introuvable`)

  const rattache = ev.payload.etiquettes
  const reference = String(ctx.reference || rattache?.reference || '')
  if (!reference) throw new Error("Ce mail n'est rattaché à aucune commande d'étiquettes : rattache d'abord le BAT depuis l'onglet Étiquettes.")
  const { data: commande } = await db.from('etiquette_commandes').select('id, reference, statut, contact').eq('reference', reference).maybeSingle()
  if (!commande) throw new Error(`Commande ${reference} introuvable`)

  // Les BAT de ce mail, sinon les BAT non validés de la commande.
  let docs = (rattache?.documents ?? []).filter(d => d.categorie === 'bat')
  if (docs.length === 0) {
    const { data: attente } = await db.from('etiquette_documents').select('id, categorie, filename').eq('commande_id', commande.id).eq('categorie', 'bat').is('valide_le', null)
    docs = (attente ?? []) as typeof docs
  }

  const compte = compteDe(ev.payload.mailbox, ev.brand ?? 'mixologue')
  if (!compte) throw new Error('Aucune boîte pour répondre à ce mail.')
  const a = ev.payload.from?.trim()
  if (!a) throw new Error("Le mail n'a pas d'expéditeur.")

  // La référence reste chez nous : Tompla a la sienne dans l'objet du fil.
  const prenom = prenomDe(a)
  const marque = ev.brand === 'aeterna' ? 'aeterna' : 'mixologue'
  const texte = [
    `Bonjour${prenom ? ` ${prenom}` : ''},`,
    '',
    'BAT validé : bon pour impression.',
    '',
    'Merci et bonne journée,',
    'Nathan',
  ].join('\n')
  const objet = ev.title ? (/^re\s*:/i.test(ev.title) ? ev.title : `Re: ${ev.title}`) : 'BAT validé'

  const info = await envoyer(compte, { a, objet, texte, enReponseA: ev.external_id, signature: marque })
  const maintenant = new Date().toISOString()

  if (docs.length > 0) await db.from('etiquette_documents').update({ valide_le: maintenant }).in('id', docs.map(d => d.id))
  if (commande.statut === 'confirmee' || commande.statut === 'passee') {
    await db.from('etiquette_commandes').update({ statut: 'en_production' }).eq('id', commande.id)
  }
  await db.rpc('merge_work_event_payload', { p_id: ev.id, p_patch: { sent: { at: maintenant, from: compte.adresse, to: a, subject: objet, message_id: info.messageId, action: 'valider_bat' } } })
  await db.rpc('mark_work_events_processed', { p_ids: [ev.id] })

  const reply = `✅ BAT validé — ${commande.reference}. Mail « bon pour impression » envoyé à ${a} depuis ${compte.adresse}` +
    `${docs.length ? ` (${docs.length} document${docs.length > 1 ? 's' : ''})` : ''}` +
    `${commande.statut === 'confirmee' || commande.statut === 'passee' ? ' · commande en production' : ''}.`
  log.info(`Action valider_bat #${ev.id} : ${commande.reference} → ${a}`)
  const salon = ev.brand === 'aeterna' ? 'aeterna' : 'mixologue'
  if (livreur) await livreur.envoyer(salon, reply).catch(() => {})
  return { reply, salon }
}

/** Le registre : `context.action` → fonction. */
export const ACTIONS: Record<string, (db: SupabaseClient, ctx: Record<string, unknown>, livreur: Livreur | null) => Promise<ResultatAction>> = {
  valider_bat: validerBat,
}
