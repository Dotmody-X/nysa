import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '../log.js'

/**
 * Web Push depuis le Pi. La PWA s'est abonnée (public.push_subscriptions,
 * RLS) ; ici on lit les abonnements de l'utilisateur avec SON client et on
 * envoie avec la clé VAPID privée, qui ne quitte pas le Pi. Un endpoint
 * qui répond 404/410 est mort : on le supprime.
 *
 * Désactivé sans bruit si VAPID_PRIVATE_KEY est absent : le service tourne
 * sans notifications plutôt que pas du tout.
 */

export type Notification = {
  title: string
  body: string
  /** Où mène le tap : le poste par défaut. */
  url?: string
  /** Deux notifications de même tag se remplacent au lieu de s'empiler. */
  tag?: string
}

type Abonnement = { id: number; endpoint: string; p256dh: string; auth: string; failures: number }

let configure = false

function pret(): boolean {
  if (configure) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:nysa@nysa.be', pub, priv)
  configure = true
  return true
}

export function pushActif(): boolean {
  return pret()
}

export async function envoyerPush(db: SupabaseClient, n: Notification): Promise<number> {
  if (!pret()) return 0
  const { data, error } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth, failures')
  if (error) {
    log.warn(`Push : abonnements illisibles (${error.message})`)
    return 0
  }
  const abonnements = (data ?? []) as Abonnement[]
  if (abonnements.length === 0) return 0

  const charge = JSON.stringify({ title: n.title, body: n.body, url: n.url ?? '/poste', tag: n.tag })
  let envoyes = 0
  await Promise.all(abonnements.map(async a => {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge, { TTL: 3600, urgency: 'high' })
      envoyes++
      await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString(), failures: 0 }).eq('id', a.id)
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        await db.from('push_subscriptions').delete().eq('id', a.id)
        log.info(`Push : abonnement ${a.id} expiré, retiré`)
      } else {
        await db.from('push_subscriptions').update({ failures: a.failures + 1 }).eq('id', a.id)
        log.warn(`Push : envoi ${a.id} en échec (${code ?? (e instanceof Error ? e.message : String(e))})`)
      }
    }
  }))
  return envoyes
}
