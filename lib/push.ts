import { createClient } from '@/lib/supabase/client'

/**
 * Web Push côté client. L'abonnement est propre à l'appareil et au
 * navigateur ; il part dans public.push_subscriptions (RLS), et c'est le Pi
 * qui envoie. Sur iPad et iPhone, ça ne marche que pour une PWA ajoutée à
 * l'écran d'accueil (iOS 16.4+), et la permission doit être demandée depuis
 * un geste de l'utilisateur — d'où un bouton, jamais un appel au chargement.
 */

export type EtatPush =
  | 'indisponible'   // navigateur sans Push API
  | 'installer'      // iOS hors écran d'accueil : Safari ne pousse pas
  | 'refuse'         // permission refusée par l'utilisateur
  | 'inactif'        // possible, pas encore abonné
  | 'actif'

export function estIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function estStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

export function supportePush(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function base64VersUint8(base64: string): Uint8Array {
  const rembourrage = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + rembourrage).replace(/-/g, '+').replace(/_/g, '/')
  const brut = atob(b64)
  return Uint8Array.from(brut, c => c.charCodeAt(0))
}

/** La clé VAPID publique, posée dans app_config par le Pi. */
export async function clePublique(): Promise<string | null> {
  const { data } = await createClient().from('app_config').select('value').eq('key', 'push').maybeSingle()
  const v = (data?.value as { vapid_public_key?: string } | null)?.vapid_public_key
  return v || null
}

async function enregistrement(): Promise<ServiceWorkerRegistration | null> {
  if (!supportePush()) return null
  // En développement, PWA.tsx n'enregistre pas le service worker.
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function etatPush(): Promise<EtatPush> {
  if (!supportePush()) return estIOS() && !estStandalone() ? 'installer' : 'indisponible'
  if (estIOS() && !estStandalone()) return 'installer'
  if (Notification.permission === 'denied') return 'refuse'
  const reg = await enregistrement()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'actif' : 'inactif'
}

/** À appeler depuis un clic. */
export async function activerPush(): Promise<EtatPush> {
  const etat = await etatPush()
  if (etat === 'indisponible' || etat === 'installer' || etat === 'refuse') return etat

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'refuse'

  const cle = await clePublique()
  if (!cle) throw new Error("Clé publique absente : le Pi n'a pas encore posé sa clé VAPID dans app_config.")

  const reg = (await enregistrement()) ?? (await navigator.serviceWorker.register('/sw.js'))
  await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64VersUint8(cle) as BufferSource }))

  const json = sub.toJSON()
  const { error } = await createClient().from('push_subscriptions').upsert(
    { endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '', user_agent: navigator.userAgent.slice(0, 200) },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(error.message)
  return 'actif'
}

export async function desactiverPush(): Promise<EtatPush> {
  const reg = await enregistrement()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await createClient().from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
  return 'inactif'
}
