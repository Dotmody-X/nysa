import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { mailConfig } from '../config.js'
import { serviceSession } from '../identity.js'
import { userClient } from '../supabase.js'
import { classer, type MailBrut, type MarqueMail } from './classify.js'
import { log } from '../log.js'

/**
 * nysa-mail : les boîtes OVH en écoute permanente (IMAP IDLE — c'est le
 * serveur qui pousse le mail à l'instant où il arrive), chaque mail classé
 * et déposé dans work.events par public.log_work_event, sous le JWT d'une
 * identité de service. Remplace le workflow n8n « Mails OVH → Supabase »,
 * mort en silence le 14 août 2026 quand son conteneur a perdu le DNS.
 *
 * Ce qui le rend robuste : systemd le relance, chaque boîte se reconnecte
 * seule avec un délai croissant, le dernier UID vu est persisté, et la base
 * dédoublonne sur (user_id, source, external_id) — redéposer ne coûte rien.
 */

const config = mailConfig()
const SERVICE = 'nysa-mail'
const PROPRIETAIRE = config.AGENT_ALLOWED_DISCORD_IDS[0]!
const FICHIER_ETAT = config.MAIL_STATE_FILE || join(homedir(), '.nysa-mail.json')
/** Taille maximale lue par message : au-delà, ce sont des pièces jointes qu'on ne stocke pas. */
const SOURCE_MAX = 1_000_000

type Etat = Record<string, { lastUid: number; uidValidity: number }>

function lireEtat(): Etat {
  try {
    return JSON.parse(readFileSync(FICHIER_ETAT, 'utf8')) as Etat
  } catch {
    return {}
  }
}

function ecrireEtat(etat: Etat) {
  const tmp = `${FICHIER_ETAT}.tmp`
  writeFileSync(tmp, JSON.stringify(etat, null, 2))
  renameSync(tmp, FICHIER_ETAT)
}

const etat = lireEtat()

function adresseTexte(a: { text?: string } | { text?: string }[] | undefined): string {
  if (!a) return ''
  return Array.isArray(a) ? a.map(x => x.text ?? '').filter(Boolean).join(', ') : (a.text ?? '')
}

class Boite {
  private client: ImapFlow | null = null
  private enCours = false
  private aRefaire = false
  private delaiReconnexion = 5_000

  constructor(private readonly marque: MarqueMail, private readonly adresse: string, private readonly motDePasse: string) {}

  private get cle() { return this.marque }

  async demarrer() {
    for (;;) {
      try {
        await this.tenir()
        this.delaiReconnexion = 5_000
      } catch (e) {
        log.error(`[${this.marque}] connexion perdue : ${e instanceof Error ? e.message : String(e)}`)
      }
      log.info(`[${this.marque}] reconnexion dans ${Math.round(this.delaiReconnexion / 1000)} s`)
      await new Promise(r => setTimeout(r, this.delaiReconnexion))
      this.delaiReconnexion = Math.min(this.delaiReconnexion * 2, 120_000)
    }
  }

  /** Une connexion, du début à la fin : résout quand elle se ferme. */
  private async tenir() {
    const client = new ImapFlow({
      host: config.MAIL_HOST,
      port: config.MAIL_PORT,
      secure: true,
      auth: { user: this.adresse, pass: this.motDePasse },
      logger: false,
      // Le service tourne des semaines : sans plafond, un IDLE trop long finit
      // coupé par le serveur sans que le client s'en aperçoive.
      maxIdleTime: 4 * 60_000,
    })
    this.client = client

    const fermee = new Promise<void>((resolve, reject) => {
      client.once('close', () => resolve())
      client.once('error', e => reject(e))
    })

    await client.connect()
    const boite = await client.mailboxOpen('INBOX')
    log.info(`[${this.marque}] connecté : ${this.adresse}, ${boite.exists} messages, UIDVALIDITY ${boite.uidValidity}`)

    const validity = Number(boite.uidValidity)
    const memo = etat[this.cle]
    if (!memo || memo.uidValidity !== validity) {
      etat[this.cle] = { lastUid: 0, uidValidity: validity }
      ecrireEtat(etat)
      if (memo) log.warn(`[${this.marque}] UIDVALIDITY a changé : reprise sur ${config.MAIL_BACKFILL_DAYS} jour(s)`)
    }

    client.on('exists', (data: { count: number; prevCount: number }) => {
      if (data.count > data.prevCount) void this.rattraper()
    })

    await this.rattraper()
    await fermee
  }

  /** Tout ce qui est arrivé depuis le dernier UID vu. Une seule passe à la fois. */
  private async rattraper() {
    if (this.enCours) {
      this.aRefaire = true
      return
    }
    this.enCours = true
    try {
      do {
        this.aRefaire = false
        await this.lireNouveaux()
      } while (this.aRefaire)
    } catch (e) {
      log.error(`[${this.marque}] lecture des nouveaux messages : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      this.enCours = false
    }
  }

  private async lireNouveaux() {
    const client = this.client
    if (!client) return
    const memo = etat[this.cle]!

    let plage: string | { since: Date }
    if (memo.lastUid > 0) {
      plage = `${memo.lastUid + 1}:*`
    } else if (config.MAIL_BACKFILL_DAYS > 0) {
      plage = { since: new Date(Date.now() - config.MAIL_BACKFILL_DAYS * 86_400_000) }
    } else {
      // Rien à reprendre : on se cale sur le dernier message et on attend la suite.
      const dernier = await client.fetchOne('*', { uid: true })
      if (dernier) {
        memo.lastUid = dernier.uid
        ecrireEtat(etat)
      }
      return
    }

    const session = await serviceSession(SERVICE, PROPRIETAIRE)
    const db = userClient(session.accessToken)
    let lus = 0
    let deposes = 0

    for await (const msg of client.fetch(plage, { uid: true, envelope: true, source: { maxLength: SOURCE_MAX } }, { uid: true })) {
      // « N:* » renvoie aussi le dernier message quand rien n'est arrivé.
      if (msg.uid <= memo.lastUid) continue
      lus++
      try {
        const brut = await this.parser(msg.uid, msg.envelope, msg.source)
        const ev = classer(brut, this.marque, config.AGENT_TIMEZONE)
        if (ev) {
          const { data, error } = await db.rpc('log_work_event', ev)
          if (error) throw new Error(`log_work_event : ${error.message}`)
          if (data !== null) {
            deposes++
            log.info(`[${this.marque}] ${ev.p_type} ${ev.p_urgency === 1 ? '!' : ''}« ${ev.p_title.slice(0, 70)} »`)
          }
        }
      } catch (e) {
        // On ne bloque pas la boîte sur un message : il est journalisé, on avance.
        log.error(`[${this.marque}] message UID ${msg.uid} non traité : ${e instanceof Error ? e.message : String(e)}`)
      }
      memo.lastUid = Math.max(memo.lastUid, msg.uid)
      ecrireEtat(etat)
    }
    if (lus) log.info(`[${this.marque}] ${lus} message(s) lu(s), ${deposes} déposé(s)`)
  }

  private async parser(uid: number, envelope: { subject?: string; date?: Date | string; messageId?: string } | undefined, source: Buffer | undefined): Promise<MailBrut> {
    const parsed = source ? await simpleParser(source) : null
    const dateEnveloppe = envelope?.date ? new Date(envelope.date) : null
    return {
      uid,
      subject: parsed?.subject ?? envelope?.subject ?? '',
      from: adresseTexte(parsed?.from),
      to: adresseTexte(parsed?.to),
      date: parsed?.date ?? (dateEnveloppe && !Number.isNaN(dateEnveloppe.getTime()) ? dateEnveloppe : null),
      messageId: parsed?.messageId ?? envelope?.messageId ?? null,
      text: parsed?.text ?? '',
      html: typeof parsed?.html === 'string' ? parsed.html : '',
      attachments: parsed?.attachments.length ?? 0,
    }
  }
}

async function main() {
  // La session du service est créée au premier démarrage, à partir du compte
  // Discord lié du propriétaire : on vérifie tout de suite qu'elle s'ouvre.
  const session = await serviceSession(SERVICE, PROPRIETAIRE)
  log.info(`nysa-mail : dépôt au nom de ${session.email ?? session.userId}`)

  const boites = config.MAIL_ACCOUNTS.map(({ marque, adresse }) => {
    const motDePasse = process.env[`MAIL_PASS_${marque.toUpperCase()}`]
    if (!motDePasse) {
      console.error(`MAIL_PASS_${marque.toUpperCase()} manquant dans agent/.env pour ${adresse}`)
      process.exit(1)
    }
    return new Boite(marque, adresse, motDePasse)
  })

  await Promise.all(boites.map(b => b.demarrer()))
}

main().catch(e => {
  log.error('nysa-mail : arrêt', e)
  process.exit(1)
})
