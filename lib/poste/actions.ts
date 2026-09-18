import type { InboxItem } from '@/hooks/useInbox'

/**
 * Les gestes du poste. Le principe : l'iPad ne sert qu'à appuyer ; ce qui
 * demande des mots se passe dans Discord, où Claude reprend le fil du salon.
 * Chaque action est une demande (work.agent_requests) livrée dans un salon.
 */

export type ActionPoste = {
  id: string
  label: string
  /** Le salon Discord où la réponse est postée. */
  channel: string
  question: string
}

export const ACTIONS: ActionPoste[] = [
  {
    id: 'brief', label: 'Brief du matin', channel: 'brief',
    question: "Rédige le brief du matin : l'agenda du jour, les tâches dues et en retard par marque, ce qui attend " +
      "dans le courrier (inbox) avec l'urgence, et le temps d'hier. Enregistre-le avec ecrire_brief (kind « brief »), " +
      'puis donne-le ici en entier.',
  },
  {
    id: 'debrief', label: 'Débrief du soir', channel: 'brief',
    question: "Rédige le débrief du soir : le temps passé aujourd'hui par projet (temps_recent), ce qui a été fait, " +
      "les notes du jour (lire_notes), ce qui reste pour demain. Enregistre-le avec ecrire_brief (kind « debrief »), " +
      'puis donne-le ici en entier.',
  },
  {
    id: 'taches', label: 'Tâches du jour', channel: 'taches',
    question: "Liste mes tâches dues aujourd'hui et en retard, groupées par marque, avec l'échéance et la priorité. Court.",
  },
  {
    id: 'temps', label: 'Temps du jour', channel: 'temps',
    question: "Résume mon temps d'aujourd'hui : le total, la répartition par projet, et ce qui tourne en ce moment.",
  },
  {
    id: 'courrier', label: 'Courrier en attente', channel: 'inbox',
    question: 'Résume ce qui attend dans le courrier (inbox), par urgence, avec ce que tu proposes pour chacun. Court.',
  },
]

const BRAND_LABEL: Record<string, string> = { mixologue: 'Mixologue', esmoker: 'e-Smoker', aeterna: 'Aeterna', transverse: 'Transverse' }

/** Le salon d'un mail : celui de sa marque, sinon #inbox. */
export function salonDe(item: InboxItem): string {
  return item.brand === 'mixologue' || item.brand === 'aeterna' || item.brand === 'esmoker' ? item.brand : 'inbox'
}

/** La carte du mail, telle qu'elle est postée dans le salon avant la réponse de Claude. */
export function carteMail(item: InboxItem): string {
  const marque = item.brand ? BRAND_LABEL[item.brand] : null
  const ai = item.ai && !item.ai.echec ? item.ai : null
  const lignes = [
    `📨 **Mail transmis depuis le poste**${marque ? ` — ${marque}` : ''}`,
    `**De :** ${item.expediteur ?? '?'}`,
    `**Objet :** ${item.title || '(sans objet)'}`,
    `**Boîte :** ${item.boite ?? '?'} · reçu le ${new Date(item.occurred_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` +
      (item.pieces > 0 ? ` · ${item.pieces} pièce${item.pieces > 1 ? 's' : ''} jointe${item.pieces > 1 ? 's' : ''}` : ''),
  ]
  if (item.extrait) lignes.push(`> ${item.extrait.slice(0, 500).replace(/\n/g, ' ')}`)
  if (ai?.resume) lignes.push(`🧭 ${ai.resume}${ai.action && ai.action.toLowerCase() !== 'rien' ? ` — *${ai.action}*` : ''}`)
  return lignes.join('\n')
}

/** Le contexte commun des demandes qui portent un mail. */
export function contexteMail(item: InboxItem) {
  return {
    event_id: item.id,
    brand: item.brand ?? undefined,
    from: item.expediteur ?? undefined,
    subject: item.title ?? undefined,
    mailbox: item.boite ?? undefined,
    extrait: item.extrait ?? undefined,
    recu_le: item.occurred_at,
    ...(item.ai?.resume ? { triage: item.ai.resume, action_proposee: item.ai.action } : {}),
  }
}

export const QUESTION_MAIL_DISCORD =
  "Ce mail vient d'être transmis depuis le poste : c'est le message juste au-dessus dans ce salon. " +
  "Dis en trois lignes ce que c'est, ce que ça implique, et ce que tu proposes. Ensuite j'écrirai ici ce que je veux faire."

export const QUESTION_BROUILLON =
  "Rédige un brouillon de réponse au mail juste au-dessus dans ce salon : en français (ou dans la langue du mail), " +
  'ton professionnel et chaleureux, court, signé Nathan. Je te dirai ici les corrections, puis je le copierai dans le webmail.'

/** Le salon d'une marque, d'après `projects.groupe` ou une catégorie libre. */
export function salonDuGroupe(groupe: string | null): string {
  const g = (groupe ?? '').toLowerCase()
  if (g.includes('mixo')) return 'mixologue'
  if (g.includes('aeterna')) return 'aeterna'
  if (g.includes('smoker')) return 'esmoker'
  return 'brief'
}

/** « Prépare-moi » avant un rendez-vous. */
export function questionPreparation(titre: string, heure: string | null, lieu: string | null, description: string | null, projet: string | null): string {
  const quoi = [
    `Rendez-vous « ${titre} »${heure ? ` à ${heure}` : " aujourd'hui"}`,
    lieu ? `lieu : ${lieu}` : null,
    projet ? `projet : ${projet}` : null,
    description ? `note : ${description.slice(0, 300)}` : null,
  ].filter(Boolean).join(' · ')
  return `Prépare-moi pour ce rendez-vous — ${quoi}. En dix lignes maximum : qui, quoi, ce qu'il faut avoir en tête ` +
    '(tâches ouvertes liées, derniers mails de cette personne ou de cette marque dans l\'inbox, dernière commande ou devis), ' +
    "et les deux ou trois points à aborder. Rien d'inventé : si tu ne trouves rien, dis-le."
}
