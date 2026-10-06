/**
 * Le mini-cerveau de Nysa : ce qu'elle apprend des corrections de Nathan
 * (Cahier des charges du cerveau, §12, phase 9 ; tables public.memoire et
 * public.erreurs, migration 20261006130000_memoire_de_nysa.sql).
 *
 * L'exemple fondateur : « mets ça dans mixo ». Avant, `ilike '%mixo%'` prenait
 * le premier projet venu (« Crm Mixo ») sans rien dire, et « Le Mixologue »,
 * qui est une marque et pas un projet, ne trouvait rien : la tâche partait sans
 * projet. Désormais :
 *   1. un surnom appris l'emporte ;
 *   2. puis le nom exact d'un projet ;
 *   3. puis une correspondance UNIQUE ;
 *   4. sinon Nysa ne devine pas : elle demande, et la réponse devient une règle.
 *
 * Une marque entière (« mixo » → Le Mixologue, venu du lexique commun) ne suffit
 * pas à choisir un projet quand elle en a plusieurs : Nysa demande lequel, une
 * fois, et la réponse précise la règle vers ce projet.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentContext } from './context.js'

export type Regle = {
  id: number
  type: 'alias' | 'regle' | 'preference' | 'erreur'
  cle: string
  valeur: string
  cible_projet: string | null
  cible_groupe: string | null
  origine: 'correction' | 'explicite' | 'deduit' | 'lexique'
  confiance: number
  utilisations: number
  statut: 'active' | 'a_confirmer' | 'retiree'
}

export type Projet = { id: string; name: string; groupe: string | null; status?: string | null }

const COLONNES = 'id, type, cle, valeur, cible_projet, cible_groupe, origine, confiance, utilisations, statut'

/** Comparer comme on parle : sans casse, sans accents, sans le préfixe « [AE] » des projets. */
export function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^\s*\[[^\]]*\]\s*/, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Une erreur que le modèle doit lire et transmettre à Nathan sous forme de question. */
export class ProjetIncertain extends Error {}

export async function reglesVivantes(db: SupabaseClient): Promise<Regle[]> {
  const { data } = await db
    .from('memoire')
    .select(COLONNES)
    .in('statut', ['active', 'a_confirmer'])
    .order('utilisations', { ascending: false })
    .limit(200)
  return (data as Regle[] | null) ?? []
}

async function projets(db: SupabaseClient): Promise<Projet[]> {
  const { data } = await db.from('projects').select('id, name, groupe, status')
  return (data as Projet[] | null) ?? []
}

const actif = (p: Projet) => !['archived', 'archive', 'done', 'termine'].includes((p.status ?? '').toLowerCase())

async function noterUsage(ctx: AgentContext, r: Regle): Promise<void> {
  // Une règle qui sert sans être contredite gagne en confiance (§12).
  await ctx.db
    .from('memoire')
    .update({
      utilisations: r.utilisations + 1,
      confiance: r.confiance + 1,
      derniere_utilisation: new Date().toISOString(),
    })
    .eq('id', r.id)
}

function question(nom: string, candidats: Projet[], pourquoi: string): ProjetIncertain {
  const liste = candidats.slice(0, 12).map(p => `« ${p.name} »${p.groupe ? ` (${p.groupe})` : ''}`).join(', ')
  return new ProjetIncertain(
    `${pourquoi} N'enregistre rien et ne devine pas : demande à Nathan lequel il veut` +
      (liste ? ` parmi ${liste}` : '') +
      `. Quand il répond, appelle \`apprendre\` (cle « ${nom} », valeur = le projet choisi, ` +
      `demande = sa phrase d'origine, compris = ce que tu avais compris), puis refais l'action avec ce projet.`,
  )
}

/**
 * Le projet que désigne `nom`. Lève ProjetIncertain quand il faut demander.
 * Renvoie aussi la règle qui a servi, pour que l'outil puisse le dire.
 */
export async function resoudreProjet(ctx: AgentContext, nom: string): Promise<{ projet: Projet; via: Regle | null }> {
  const tous = await projets(ctx.db)
  const vivants = tous.filter(actif)
  const n = normaliser(nom)

  // 1. Un surnom appris — seulement s'il désigne un projet ou une marque : « condor »
  //    veut dire le Pi de la maison, il ne doit pas détourner le projet « Condor ».
  const regle = (await reglesVivantes(ctx.db)).find(
    r => r.type === 'alias' && normaliser(r.cle) && normaliser(r.cle) === n && (r.cible_projet || r.cible_groupe),
  )
  if (regle) {
    const cible = regle.cible_projet ? tous.find(p => p.id === regle.cible_projet) : undefined
    if (cible) {
      await noterUsage(ctx, regle)
      return { projet: cible, via: regle }
    }
    const groupe = regle.cible_groupe ?? regle.valeur
    const duGroupe = vivants.filter(p => p.groupe && normaliser(p.groupe) === normaliser(groupe))
    if (duGroupe.length === 1) {
      await noterUsage(ctx, regle)
      return { projet: duGroupe[0]!, via: regle }
    }
    const parNom = vivants.filter(p => normaliser(p.name) === normaliser(regle.valeur))
    if (parNom.length === 1) {
      await noterUsage(ctx, regle)
      return { projet: parNom[0]!, via: regle }
    }
    throw question(nom, duGroupe.length ? duGroupe : vivants,
      duGroupe.length > 1
        ? `« ${nom} » veut dire ${regle.valeur} (règle apprise), qui compte plusieurs projets.`
        : `« ${nom} » veut dire ${regle.valeur} (règle apprise), mais ce projet n'existe plus.`)
  }

  // 2. Le nom exact (même archivé : un nom exact ne se discute pas).
  const exact = tous.filter(p => normaliser(p.name) === n)
  if (exact.length === 1) return { projet: exact[0]!, via: null }

  // 3. Une correspondance unique parmi les projets vivants.
  const partiels = vivants.filter(p => normaliser(p.name).includes(n))
  if (partiels.length === 1) return { projet: partiels[0]!, via: null }

  // 4. Une marque nommée en entier (« Le Mixologue ») : un projet s'il n'y en a qu'un.
  const duGroupe = vivants.filter(p => p.groupe && normaliser(p.groupe) === n)
  if (duGroupe.length === 1) return { projet: duGroupe[0]!, via: null }

  if (partiels.length > 1) throw question(nom, partiels, `« ${nom} » correspond à plusieurs projets.`)
  if (duGroupe.length > 1) throw question(nom, duGroupe, `« ${nom} » est une marque qui compte plusieurs projets.`)
  throw question(nom, vivants, `Aucun projet ne correspond à « ${nom} ».`)
}

/** La cible d'une valeur : un projet précis, ou une marque entière. */
export async function cibleDe(db: SupabaseClient, valeur: string): Promise<{ cible_projet: string | null; cible_groupe: string | null }> {
  const tous = await projets(db)
  const v = normaliser(valeur)
  const projet = tous.filter(p => normaliser(p.name) === v)
  if (projet.length === 1) return { cible_projet: projet[0]!.id, cible_groupe: null }
  const groupe = tous.find(p => p.groupe && normaliser(p.groupe) === v)
  return { cible_projet: null, cible_groupe: groupe?.groupe ?? null }
}

/**
 * Retenir une règle : met à jour la règle vivante de même clé, sinon la crée.
 * Une correction ou une parole explicite est active tout de suite (§12) ;
 * sa confiance repart à 1, puisqu'elle vient d'être contredite.
 */
export async function retenir(
  ctx: AgentContext,
  r: { type: Regle['type']; cle: string; valeur: string; origine: 'correction' | 'explicite'; exemple?: string | null },
): Promise<Regle> {
  const cle = r.cle.trim().toLowerCase()
  const cibles = await cibleDe(ctx.db, r.valeur)
  const existante = (await reglesVivantes(ctx.db)).find(x => x.type === r.type && x.cle.toLowerCase() === cle)
  const champs = {
    valeur: r.valeur.trim(),
    ...cibles,
    origine: r.origine,
    exemple: r.exemple ?? null,
    statut: 'active' as const,
    confiance: 1,
    updated_at: new Date().toISOString(),
  }
  const requete = existante
    ? ctx.db.from('memoire').update(champs).eq('id', existante.id)
    : ctx.db.from('memoire').insert({ user_id: ctx.userId, type: r.type, cle, ...champs })
  const { data, error } = await requete.select(COLONNES).single()
  if (error) throw new Error(`mémoire non enregistrée : ${error.message}`)
  return data as Regle
}

/** Le bloc de la consigne système : ce que Nysa sait, et comment apprendre. */
export function blocMemoire(regles: Regle[]): string {
  const dire = (r: Regle) => {
    const quoi = r.type === 'alias' ? `« ${r.cle} » → ${r.valeur}` : `${r.cle} : ${r.valeur}`
    const d = [r.origine === 'lexique' ? 'lexique commun' : r.origine, r.utilisations ? `servi ${r.utilisations} fois` : null]
    return `- ${quoi} (${d.filter(Boolean).join(', ')})`
  }
  const actives = regles.filter(r => r.statut === 'active')
  const aConfirmer = regles.filter(r => r.statut === 'a_confirmer')
  const lignes = [
    '',
    '## Ce que tu as appris de Nathan',
    '',
    actives.length
      ? 'Ces règles viennent de ses corrections, de ce qu\'il t\'a dit, et du lexique commun de son cerveau. ' +
        'Applique-les sans redemander : les outils de projet les connaissent déjà. (Le lexique est écrit ' +
        'pour Nathan : son « toi », c\'est lui.)'
      : 'Rien encore : tu apprendras de ses corrections.',
    ...actives.map(dire),
  ]
  if (aConfirmer.length) {
    lignes.push(
      '',
      'À confirmer (remarqué, pas encore validé) : applique, mais dis-le en une phrase ' +
        '(« J\'ai classé ça dans Le Mixologue, c\'est bien ça ? »).',
      ...aConfirmer.map(dire),
    )
  }
  lignes.push(
    '',
    'Quand Nathan te corrige (« non, c\'est X », « mixo c\'est Le Mixologue »), ou te dit comment il ' +
      'nomme une chose, appelle aussitôt `apprendre` : sa demande, ce que tu avais compris, ce qu\'il ' +
      'voulait. Une correction devient une règle tout de suite. Quand un outil te répond qu\'un projet est ' +
      'incertain, ne devine jamais : pose la question, puis apprends la réponse.',
    'Une règle ne t\'autorise jamais seule une action irréversible (supprimer, envoyer un message) : ' +
      'celles-là demandent toujours l\'accord de Nathan.',
  )
  return lignes.join('\n')
}

// ── Le lexique commun du cerveau (99_Meta/Lexique.md), recopié dans la mémoire ──

const LEXIQUE_DELAI_MS = 6 * 3600_000
let dernierLexique = 0

function lireLexique(vault: string): { cle: string; valeur: string }[] {
  const chemin = `${vault}/99_Meta/Lexique.md`
  if (!existsSync(chemin)) return []
  const entrees: { cle: string; valeur: string }[] = []
  for (const ligne of readFileSync(chemin, 'utf8').split('\n')) {
    const cellules = ligne.split('|').map(c => c.trim())
    // | Tu dis | Ça veut dire | Origine |
    if (cellules.length < 4 || !cellules[1] || /^-+$/.test(cellules[1]) || cellules[1] === 'Tu dis') continue
    const cle = cellules[1].replace(/`/g, '').trim()
    const valeur = cellules[2]!
      .split(' — ')[0]!
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .trim()
    if (cle && valeur) entrees.push({ cle: cle.toLowerCase(), valeur })
  }
  return entrees
}

/**
 * Recopie le lexique commun dans la mémoire (origine « lexique »), au plus toutes
 * les 6 h ou quand le fichier a changé. Une règle née d'une correction n'est
 * jamais écrasée par le lexique : ce que Nathan a corrigé l'emporte.
 */
export async function synchroniserLexique(db: SupabaseClient, userId: string, vault: string | null): Promise<void> {
  if (!vault) return
  const chemin = `${vault}/99_Meta/Lexique.md`
  const modifie = existsSync(chemin) ? statSync(chemin).mtimeMs : 0
  if (Date.now() - dernierLexique < LEXIQUE_DELAI_MS && modifie < dernierLexique) return
  dernierLexique = Date.now()
  const vivantes = await reglesVivantes(db)
  for (const { cle, valeur } of lireLexique(vault)) {
    const existante = vivantes.find(r => r.type === 'alias' && r.cle.toLowerCase() === cle)
    if (existante && (existante.origine !== 'lexique' || existante.valeur === valeur)) continue
    const cibles = await cibleDe(db, valeur)
    if (existante) {
      await db.from('memoire').update({ valeur, ...cibles, updated_at: new Date().toISOString() }).eq('id', existante.id)
    } else {
      await db.from('memoire').insert({ user_id: userId, type: 'alias', cle, valeur, ...cibles, origine: 'lexique', statut: 'active' })
    }
  }
}
