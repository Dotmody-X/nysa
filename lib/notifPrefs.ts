// Préférences de notifications (localStorage). Toggles → sauvegarde immédiate.

import { userKey } from '@/lib/userStore'

export type NotifPrefs = Record<string, boolean>

const KEY = 'nysa_notif_prefs'

export const NOTIF_DEFS: { key: string; label: string; desc: string; default: boolean }[] = [
  { key: 'task_reminders', label: 'Rappels de tâches',   desc: 'Avant une échéance',              default: true  },
  { key: 'daily_summary',  label: 'Résumé quotidien',     desc: 'Chaque matin',                    default: false },
  { key: 'goals',          label: 'Objectifs atteints',   desc: 'Célébration automatique',         default: true  },
  { key: 'budget_alerts',  label: 'Alertes budget',       desc: 'Dépassement de seuil',            default: true  },
  { key: 'expiry',         label: 'Péremptions (DLC)',    desc: 'Aliments bientôt périmés',        default: true  },
  { key: 'run_weather',    label: 'Météo des runs',       desc: 'Avant tes courses prévues',       default: false },
]

export function loadNotifPrefs(): NotifPrefs {
  const base = Object.fromEntries(NOTIF_DEFS.map(d => [d.key, d.default]))
  try { return { ...base, ...JSON.parse(localStorage.getItem(userKey(KEY)) || '{}') } } catch { return base }
}

export function saveNotifPrefs(p: NotifPrefs) {
  try { localStorage.setItem(userKey(KEY), JSON.stringify(p)) } catch { /* ignore */ }
}
