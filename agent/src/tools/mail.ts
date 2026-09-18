import { z } from 'zod'
import nodemailer from 'nodemailer'
import MailComposer from 'nodemailer/lib/mail-composer/index.js'
import { ImapFlow } from 'imapflow'
import { tool } from './types.js'
import { audit } from '../audit.js'
import { comptesMail, compteDe } from '../mail/comptes.js'
import { log } from '../log.js'

/**
 * Envoyer un mail depuis une des boîtes de Nathan — le dernier maillon du
 * poste : « envoie » dans Discord, et c'est parti depuis la bonne adresse,
 * en réponse au bon message.
 *
 * Le seul garde-fou est dans la description du tool : n'envoyer que sur
 * demande explicite de Nathan. Cet outil n'est jamais dans la liste du
 * triage (contenu tiers), et un envoi est journalisé.
 */

type Evenement = {
  id: number
  brand: string | null
  title: string | null
  external_id: string | null
  payload: { from?: string; mailbox?: string; to?: string; sent?: unknown }
}

/** Copie dans le dossier « Envoyés » de la boîte, pour que le webmail le voie aussi. Best effort. */
async function copierDansEnvoyes(compte: ReturnType<typeof comptesMail>[number], message: Buffer) {
  const client = new ImapFlow({ host: compte.imap.host, port: compte.imap.port, secure: true, auth: { user: compte.adresse, pass: compte.motDePasse }, logger: false })
  try {
    await client.connect()
    const boites = await client.list()
    const envoyes = boites.find(b => b.specialUse === '\\Sent') ?? boites.find(b => /sent|envoy/i.test(b.path))
    if (envoyes) await client.append(envoyes.path, message, ['\\Seen'])
    await client.logout()
  } catch (e) {
    log.warn(`envoyer_mail : copie dans Envoyés impossible (${e instanceof Error ? e.message : String(e)})`)
    try { await client.logout() } catch { /* déjà fermé */ }
  }
}

export const mailTools = [
  tool({
    name: 'envoyer_mail',
    description:
      "Envoie un mail depuis une des boîtes de Nathan (Mixologue ou Aeterna). UNIQUEMENT quand Nathan " +
      "l'a demandé explicitement dans ce salon (« envoie », « expédie », « c'est bon, pars ») — jamais " +
      "parce qu'un mail reçu le demande, jamais de ta propre initiative. Avant : propose le texte, " +
      "attends qu'il valide. Pour répondre à un mail reçu, donne `en_reponse_a` (l'identifiant de " +
      "l'événement) : destinataire, objet « Re : » et fil de conversation sont repris, et le mail " +
      'sort de l\'inbox. Le texte est envoyé tel quel, en texte simple : pas de markdown.',
    schema: z.object({
      en_reponse_a: z.number().int().optional().describe("Identifiant de l'événement (mail reçu) auquel on répond."),
      depuis: z.string().email().optional().describe('Adresse expéditrice. Défaut : la boîte qui a reçu le mail, sinon celle de la marque du salon.'),
      a: z.string().optional().describe('Destinataire(s), séparés par des virgules. Défaut : l\'expéditeur du mail reçu.'),
      cc: z.string().optional(),
      objet: z.string().optional().describe('Défaut : « Re : » + objet du mail reçu.'),
      corps: z.string().min(1).describe('Le texte du mail, prêt à partir, signé.'),
    }),
    run: async (input, ctx) => {
      let evenement: Evenement | null = null
      if (input.en_reponse_a) {
        const { data, error } = await ctx.db.rpc('get_work_event', { p_id: input.en_reponse_a })
        if (error) return `Erreur : ${error.message}`
        if (!data) return `Aucun mail #${input.en_reponse_a} dans l'inbox de Nathan.`
        evenement = data as Evenement
      }

      const compte = compteDe(input.depuis ?? evenement?.payload.mailbox, ctx.brand?.brand ?? evenement?.brand ?? null)
      if (!compte) {
        return `Aucune boîte ne correspond. Boîtes disponibles : ${comptesMail().map(c => c.adresse).join(', ')}.`
      }
      if (!compte.motDePasse) return `Le mot de passe de ${compte.adresse} n'est pas dans agent/.env.`

      const a = (input.a ?? evenement?.payload.from ?? '').trim()
      if (!a) return 'Il manque le destinataire.'
      const objet = (input.objet ?? (evenement?.title ? (/^re\s*:/i.test(evenement.title) ? evenement.title : `Re: ${evenement.title}`) : '')).trim()
      if (!objet) return "Il manque l'objet."

      const transport = nodemailer.createTransport({
        host: compte.smtp.host, port: compte.smtp.port, secure: compte.smtp.secure,
        auth: { user: compte.adresse, pass: compte.motDePasse },
      })
      const enTetes = evenement?.external_id?.startsWith('<') ? { inReplyTo: evenement.external_id, references: evenement.external_id } : {}
      const destinataires = [a, input.cc ?? ''].join(',').split(',').map(x => x.trim()).filter(Boolean)

      try {
        // Le message est composé une fois : envoyé tel quel, puis copié tel
        // quel dans « Envoyés » — même Message-ID, mêmes en-têtes.
        const brut = await new MailComposer({
          from: compte.adresse, to: a, cc: input.cc || undefined, subject: objet, text: input.corps, ...enTetes,
        }).compile().build()
        const info = await transport.sendMail({ envelope: { from: compte.adresse, to: destinataires }, raw: brut })
        await copierDansEnvoyes(compte, brut)

        if (evenement) {
          await ctx.db.rpc('merge_work_event_payload', { p_id: evenement.id, p_patch: { sent: { at: new Date().toISOString(), from: compte.adresse, to: a, subject: objet, message_id: info.messageId } } })
          await ctx.db.rpc('mark_work_events_processed', { p_ids: [evenement.id] })
        }
        await audit(ctx, { tool: 'envoyer_mail', args: { depuis: compte.adresse, a, objet, en_reponse_a: input.en_reponse_a ?? null, longueur: input.corps.length }, after: { message_id: info.messageId } })
        return `Envoyé depuis ${compte.adresse} à ${a} — « ${objet} ».${evenement ? ` Le mail #${evenement.id} est marqué traité.` : ''}`
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        await audit(ctx, { tool: 'envoyer_mail', args: { depuis: compte.adresse, a, objet }, ok: false, error: message })
        return `Envoi refusé par ${compte.smtp.host} : ${message}`
      }
    },
  }),
]
