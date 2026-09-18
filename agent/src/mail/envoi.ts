import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import nodemailer from 'nodemailer'
import MailComposer from 'nodemailer/lib/mail-composer/index.js'
import { ImapFlow } from 'imapflow'
import type { CompteMail } from './comptes.js'
import { log } from '../log.js'

/**
 * Envoyer depuis une boîte de Nathan : SMTP OVH, puis copie dans « Envoyés »
 * pour que le webmail le voie. Le message est composé une fois — envoyé tel
 * quel, copié tel quel. Partagé entre l'outil `envoyer_mail` (Discord) et
 * les actions du poste (validation d'un BAT).
 */
export type Envoi = {
  a: string
  cc?: string
  objet: string
  texte: string
  /** Message-ID du mail auquel on répond : le fil reste lié dans la boîte de l'autre. */
  enReponseA?: string | null
  /**
   * La signature de la marque : `agent/signatures/<marque>.png`, posée sur le
   * Pi (jamais dans le dépôt). Si le fichier existe, le mail part en HTML
   * avec l'image sous le texte ; sinon en texte simple.
   */
  signature?: 'mixologue' | 'aeterna' | null
}

/** Le PNG de signature d'une marque, s'il est sur le disque. */
export function fichierSignature(marque: string | null | undefined): string | null {
  if (!marque) return null
  const chemin = resolve(process.env.SIGNATURES_DIR || 'signatures', `${marque}.png`)
  return existsSync(chemin) ? chemin : null
}

const echapper = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export type Envoye = { messageId: string; destinataires: string[] }

export async function envoyer(compte: CompteMail, e: Envoi): Promise<Envoye> {
  if (!compte.motDePasse) throw new Error(`Le mot de passe de ${compte.adresse} n'est pas dans agent/.env.`)
  const transport = nodemailer.createTransport({
    host: compte.smtp.host, port: compte.smtp.port, secure: compte.smtp.secure,
    auth: { user: compte.adresse, pass: compte.motDePasse },
  })
  const enTetes = e.enReponseA?.startsWith('<') ? { inReplyTo: e.enReponseA, references: e.enReponseA } : {}
  const destinataires = [e.a, e.cc ?? ''].join(',').split(',').map(x => x.trim()).filter(Boolean)
  if (destinataires.length === 0) throw new Error('Aucun destinataire.')

  const png = fichierSignature(e.signature)
  const html = png
    ? `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#222">` +
      `<p style="white-space:pre-wrap;margin:0 0 16px">${echapper(e.texte)}</p>` +
      `<img src="cid:signature" alt="${compte.marque === 'aeterna' ? 'Aeterna' : 'Le Mixologue'}" style="display:block;max-width:420px;height:auto"></div>`
    : undefined
  const brut = await new MailComposer({
    from: compte.adresse, to: e.a, cc: e.cc || undefined, subject: e.objet, text: e.texte, ...enTetes,
    ...(html ? { html, attachments: [{ filename: 'signature.png', path: png!, cid: 'signature' }] } : {}),
  }).compile().build()
  const info = await transport.sendMail({ envelope: { from: compte.adresse, to: destinataires }, raw: brut })
  await copierDansEnvoyes(compte, brut)
  return { messageId: info.messageId, destinataires }
}

/** Best effort : une copie dans le dossier \Sent de la boîte. */
async function copierDansEnvoyes(compte: CompteMail, message: Buffer) {
  const client = new ImapFlow({ host: compte.imap.host, port: compte.imap.port, secure: true, auth: { user: compte.adresse, pass: compte.motDePasse }, logger: false })
  try {
    await client.connect()
    const boites = await client.list()
    const envoyes = boites.find(b => b.specialUse === '\\Sent') ?? boites.find(b => /sent|envoy/i.test(b.path))
    if (envoyes) await client.append(envoyes.path, message, ['\\Seen'])
    await client.logout()
  } catch (e) {
    log.warn(`envoi : copie dans Envoyés impossible (${e instanceof Error ? e.message : String(e)})`)
    try { await client.logout() } catch { /* déjà fermé */ }
  }
}

/** « Chloé Geneste <c@tompla.com> » → « Chloé » ; une adresse nue → sa partie locale. */
export function prenomDe(expediteur: string | null | undefined): string {
  if (!expediteur) return ''
  const nom = expediteur.replace(/\s*<[^>]*>\s*$/, '').replace(/^"|"$/g, '').trim()
  if (nom && !nom.includes('@')) return nom.split(/\s+/)[0]!
  const local = (expediteur.match(/<([^>]+)>/)?.[1] ?? expediteur).split('@')[0] ?? ''
  return local.split(/[._-]/)[0] ?? ''
}
