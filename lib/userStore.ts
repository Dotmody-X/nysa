// Cloisonnement du localStorage par compte. Chaque clé de données est
// préfixée par l'identifiant de l'utilisateur connecté → deux comptes sur
// le même navigateur ne partagent plus leurs données locales.
//
// Migration : les anciennes clés non préfixées sont attribuées UNE SEULE
// fois au premier compte connecté après la mise à jour, puis supprimées
// (jamais recopiées vers un autre compte → aucune fuite de données).

const ACTIVE = 'nysa_active_uid'
const LEGACY_FLAG = 'nysa_legacy_migrated'

// Clés de données à cloisonner (le reste — thème, accent, mode démo — reste
// au niveau de l'appareil et n'est pas lié à un compte).
const SCOPED_KEYS = [
  'nysa_inventaire', 'nysa_comptes_v2', 'nysa_objectifs_v2', 'nysa_objectifs',
  'nysa_mesures', 'nysa_preferred_store', 'nysa_resume_jour', 'nysa_notif_prefs',
  'nysa_date_format',
]
const SCOPED_PREFIXES = ['nysa_water_', 'nysa_hydration_']

function safe<T>(fn: () => T, fallback: T): T { try { return fn() } catch { return fallback } }

/** Identifiant du compte actif (vide si déconnecté). */
export function getActiveUid(): string {
  return safe(() => localStorage.getItem(ACTIVE) || '', '')
}

/** Clé localStorage cloisonnée pour le compte actif. */
export function userKey(base: string): string {
  const uid = getActiveUid()
  return uid ? `${base}::${uid}` : base
}

/** Définit le compte actif (sur connexion / changement de session). */
export function setActiveUser(uid: string | null): void {
  safe(() => {
    const prev = localStorage.getItem(ACTIVE) || ''
    if (uid) {
      if (uid !== prev) localStorage.setItem(ACTIVE, uid)
      migrateLegacy(uid)
    } else {
      localStorage.removeItem(ACTIVE)
    }
    return null
  }, null)
}

function migrateLegacy(uid: string): void {
  if (safe(() => localStorage.getItem(LEGACY_FLAG), '1')) return
  try {
    const allKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k) allKeys.push(k) }

    const moveToScoped = (base: string) => {
      const legacy = localStorage.getItem(base)
      if (legacy == null) return
      const scoped = `${base}::${uid}`
      if (localStorage.getItem(scoped) == null) localStorage.setItem(scoped, legacy)
      localStorage.removeItem(base)
    }

    SCOPED_KEYS.forEach(moveToScoped)
    for (const k of allKeys) {
      if (k.includes('::')) continue
      if (SCOPED_PREFIXES.some(p => k.startsWith(p))) moveToScoped(k)
    }
    localStorage.setItem(LEGACY_FLAG, '1')
  } catch { /* ignore */ }
}
