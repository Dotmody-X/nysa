/**
 * Les boîtes configurées dans agent/.env — lues aussi bien par nysa-mail
 * (IMAP) que par l'outil envoyer_mail (SMTP). Une seule lecture de la
 * config pour les deux sens du courrier.
 *
 * MAIL_ACCOUNTS=mixologue=nathan@…,aeterna=contact@… ; mot de passe dans
 * MAIL_PASS_<PARTIE_LOCALE> (repli MAIL_PASS_<MARQUE>) ; hôte IMAP dans
 * MAIL_HOST_<PARTIE_LOCALE> (repli MAIL_HOST_<MARQUE>, puis MAIL_HOST) ;
 * SMTP dans MAIL_SMTP_<PARTIE_LOCALE> (« hôte:port »), sinon déduit de
 * l'hôte IMAP : MX Plan ssl0.ovh.net → 465 SSL, Email Pro pro*.mail.ovh.net → 587 STARTTLS.
 */
export type CompteMail = {
  marque: 'mixologue' | 'aeterna'
  adresse: string
  motDePasse: string
  imap: { host: string; port: number }
  smtp: { host: string; port: number; secure: boolean }
}

function smtpDepuisImap(hoteImap: string): { host: string; port: number; secure: boolean } {
  if (/^pro\d*\.mail\.ovh\.net$/i.test(hoteImap) || /^ex\d*\.mail\.ovh\.net$/i.test(hoteImap)) return { host: hoteImap, port: 587, secure: false }
  return { host: hoteImap, port: 465, secure: true }
}

export function comptesMail(): CompteMail[] {
  const brut = process.env.MAIL_ACCOUNTS ?? ''
  const hoteDefaut = process.env.MAIL_HOST || 'ssl0.ovh.net'
  const port = Number(process.env.MAIL_PORT || 993)
  return brut.split(',').map(v => v.trim()).filter(Boolean).flatMap(paire => {
    const [marque, adresse] = paire.split('=').map(x => x.trim())
    if (!marque || !adresse || !adresse.includes('@') || (marque !== 'mixologue' && marque !== 'aeterna')) return []
    const local = adresse.split('@')[0]!.toUpperCase().replace(/[^A-Z0-9]/g, '_')
    const MARQUE = marque.toUpperCase()
    const motDePasse = process.env[`MAIL_PASS_${local}`] || process.env[`MAIL_PASS_${MARQUE}`] || ''
    const hoteImap = process.env[`MAIL_HOST_${local}`] || process.env[`MAIL_HOST_${MARQUE}`] || hoteDefaut
    const smtpBrut = process.env[`MAIL_SMTP_${local}`]
    const smtp = smtpBrut
      ? { host: smtpBrut.split(':')[0]!, port: Number(smtpBrut.split(':')[1] || 587), secure: Number(smtpBrut.split(':')[1] || 587) === 465 }
      : smtpDepuisImap(hoteImap)
    return [{ marque, adresse, motDePasse, imap: { host: hoteImap, port }, smtp }]
  })
}

/** La boîte d'une adresse, ou la première de la marque. */
export function compteDe(adresse: string | null | undefined, marque?: string | null): CompteMail | null {
  const comptes = comptesMail()
  if (adresse) {
    const c = comptes.find(c => c.adresse.toLowerCase() === adresse.toLowerCase())
    if (c) return c
  }
  if (marque) {
    const c = comptes.find(c => c.marque === marque)
    if (c) return c
  }
  return null
}
