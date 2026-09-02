// Nysa — widget iOS pour Scriptable
//
// iOS reserve les widgets aux applications natives : une webapp ne peut pas en
// fournir. Scriptable comble le trou en dessinant de vrais widgets depuis du
// JavaScript. Ce script lit Supabase directement, avec les droits de ton
// compte : la RLS reste le garde-fou, comme partout ailleurs dans Nysa.
//
// Mise en place : Nysa › Compte › Widget iPhone, fabrique un jeton, lance ce
// script une fois pour le lui donner. Il ne le redemandera plus.

const URL_SUPABASE = 'https://teqsxzfslpxejncrkudz.supabase.co'
const CLE_ANON = 'sb_publishable_-9NuRucbpHdoTnrwHJwgUw_v253pNX-'
const URL_NYSA = 'https://nysa.be'
const CLE_TROUSSEAU = 'nysa_refresh_token'

const ENCRE = new Color('#1a0a0a')
const FOND = new Color('#faf6f0')
const ORANGE = new Color('#e8590c')
const TEAL = new Color('#0e9594')
const ROUGE = new Color('#c92a2a')
const GRIS = new Color('#6b6560')

// ── Authentification ────────────────────────────────────────────────────────

/**
 * Echange le jeton de rafraichissement contre un jeton d'acces.
 *
 * Supabase fait tourner les jetons : celui qu'on recoit remplace celui qu'on a
 * envoye, et l'ancien devient invalide. On persiste donc le nouveau AVANT de
 * s'en servir — sans quoi un plantage laisserait le widget avec un jeton mort.
 */
async function jetonAcces() {
  if (!Keychain.contains(CLE_TROUSSEAU)) {
    const saisie = await demanderJeton()
    if (!saisie) throw new Error('Aucun jeton fourni')
    Keychain.set(CLE_TROUSSEAU, saisie)
  }

  const req = new Request(`${URL_SUPABASE}/auth/v1/token?grant_type=refresh_token`)
  req.method = 'POST'
  req.headers = { apikey: CLE_ANON, 'Content-Type': 'application/json' }
  req.body = JSON.stringify({ refresh_token: Keychain.get(CLE_TROUSSEAU) })

  const rep = await req.loadJSON()
  if (!rep.access_token) {
    Keychain.remove(CLE_TROUSSEAU)
    throw new Error('Jeton expiré — refais-en un depuis Compte › Widget iPhone')
  }

  Keychain.set(CLE_TROUSSEAU, rep.refresh_token)
  return rep.access_token
}

async function demanderJeton() {
  const a = new Alert()
  a.title = 'Jeton Nysa'
  a.message = 'Colle le jeton fabriqué dans Compte › Widget iPhone.'
  a.addTextField('refresh token')
  a.addAction('Enregistrer')
  a.addCancelAction('Annuler')
  const choix = await a.presentAlert()
  return choix === 0 ? a.textFieldValue(0).trim() : null
}

// ── Lecture des donnees ─────────────────────────────────────────────────────

async function lire(chemin, acces) {
  const req = new Request(`${URL_SUPABASE}/rest/v1/${chemin}`)
  req.headers = { apikey: CLE_ANON, Authorization: `Bearer ${acces}` }
  return req.loadJSON()
}

function aujourdhui() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function releve() {
  const acces = await jetonAcces()
  const jour = aujourdhui()

  const [enCours, duJour, taches, aRenvoyer] = await Promise.all([
    // Un chronometre en cours n'a pas de fin.
    lire('time_entries?select=description,started_at&ended_at=is.null&order=started_at.desc&limit=1', acces),
    lire(`time_entries?select=duration_seconds&started_at=gte.${jour}T00:00:00`, acces),
    lire(`tasks?select=title,status,priority&due_date=eq.${jour}&status=neq.cancelled&order=priority.desc`, acces),
    lire('etiquettes?select=saveur&etat_fichier=eq.modifie', acces),
  ])

  const secondes = duJour.reduce((s, e) => s + (e.duration_seconds || 0), 0)
  const chrono = enCours[0]
  // Le chronometre en cours n'a pas encore de duree : on la calcule.
  const depuis = chrono ? Math.floor((Date.now() - new Date(chrono.started_at)) / 1000) : 0

  return {
    chrono: chrono ? { titre: chrono.description || 'Sans titre', secondes: depuis } : null,
    secondes: secondes + depuis,
    taches,
    faites: taches.filter(t => t.status === 'done').length,
    aRenvoyer: aRenvoyer.length,
  }
}

function duree(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

// ── Rendu ───────────────────────────────────────────────────────────────────

function cadre() {
  const w = new ListWidget()
  w.backgroundColor = FOND
  w.setPadding(14, 14, 14, 14)
  w.url = URL_NYSA
  return w
}

function titre(w, texte, couleur) {
  const t = w.addText(texte.toUpperCase())
  t.font = Font.boldSystemFont(9)
  t.textColor = couleur || GRIS
}

/** Petit : le chronometre, ou les heures du jour s'il n'y en a pas. */
function petit(d) {
  const w = cadre()
  if (d.chrono) {
    titre(w, 'en cours', TEAL)
    w.addSpacer(4)
    const h = w.addText(duree(d.chrono.secondes))
    h.font = Font.boldSystemFont(26)
    h.textColor = ENCRE
    w.addSpacer(2)
    const s = w.addText(d.chrono.titre)
    s.font = Font.systemFont(11)
    s.textColor = GRIS
    s.lineLimit = 2
  } else {
    titre(w, "aujourd'hui")
    w.addSpacer(4)
    const h = w.addText(duree(d.secondes))
    h.font = Font.boldSystemFont(26)
    h.textColor = ENCRE
    w.addSpacer(2)
    const s = w.addText(`${d.faites}/${d.taches.length} tâches`)
    s.font = Font.systemFont(11)
    s.textColor = GRIS
  }
  if (d.aRenvoyer > 0) {
    w.addSpacer(4)
    const a = w.addText(`⚠ ${d.aRenvoyer} fichier${d.aRenvoyer > 1 ? 's' : ''}`)
    a.font = Font.boldSystemFont(10)
    a.textColor = ROUGE
  }
  return w
}

/** Moyen : le temps, les tâches du jour, et l'alerte étiquettes s'il y a lieu. */
function moyen(d) {
  const w = cadre()

  const entete = w.addStack()
  entete.centerAlignContent()
  const g = entete.addStack()
  g.layoutVertically()
  const lbl = g.addText(d.chrono ? 'EN COURS' : "AUJOURD'HUI")
  lbl.font = Font.boldSystemFont(9)
  lbl.textColor = d.chrono ? TEAL : GRIS
  const h = g.addText(duree(d.chrono ? d.chrono.secondes : d.secondes))
  h.font = Font.boldSystemFont(24)
  h.textColor = ENCRE
  entete.addSpacer()
  const dr = entete.addStack()
  dr.layoutVertically()
  const l2 = dr.addText('TÂCHES')
  l2.font = Font.boldSystemFont(9)
  l2.textColor = GRIS
  l2.rightAlignText()
  const c = dr.addText(`${d.faites}/${d.taches.length}`)
  c.font = Font.boldSystemFont(24)
  c.textColor = d.taches.length && d.faites === d.taches.length ? TEAL : ORANGE
  c.rightAlignText()

  if (d.chrono) {
    w.addSpacer(2)
    const s = w.addText(d.chrono.titre)
    s.font = Font.systemFont(11)
    s.textColor = GRIS
    s.lineLimit = 1
  }

  w.addSpacer(8)

  const restantes = d.taches.filter(t => t.status !== 'done').slice(0, 3)
  if (restantes.length === 0) {
    const v = w.addText(d.taches.length ? 'Tout est fait.' : 'Rien de prévu aujourd’hui.')
    v.font = Font.systemFont(12)
    v.textColor = GRIS
  } else {
    for (const t of restantes) {
      const l = w.addStack()
      l.centerAlignContent()
      const p = l.addText(t.priority === 'urgent' || t.priority === 'high' ? '▪︎' : '▫︎')
      p.font = Font.systemFont(11)
      p.textColor = t.priority === 'urgent' || t.priority === 'high' ? ROUGE : GRIS
      l.addSpacer(5)
      const n = l.addText(t.title)
      n.font = Font.systemFont(12)
      n.textColor = ENCRE
      n.lineLimit = 1
      w.addSpacer(3)
    }
  }

  if (d.aRenvoyer > 0) {
    w.addSpacer(6)
    const a = w.addText(`⚠ ${d.aRenvoyer} fichier${d.aRenvoyer > 1 ? 's' : ''} d’étiquette à envoyer`)
    a.font = Font.boldSystemFont(10)
    a.textColor = ROUGE
    a.lineLimit = 1
  }
  return w
}

function erreur(message) {
  const w = cadre()
  titre(w, 'nysa', ROUGE)
  w.addSpacer(6)
  const t = w.addText(message)
  t.font = Font.systemFont(12)
  t.textColor = ENCRE
  return w
}

// ── Point d'entree ──────────────────────────────────────────────────────────

let widget
try {
  const d = await releve()
  widget = config.widgetFamily === 'small' ? petit(d) : moyen(d)
} catch (e) {
  widget = erreur(String(e.message || e))
}

// Rafraichissement toutes les dix minutes : iOS n'en tient pas rigueur, et
// c'est le rythme d'un chronometre qu'on regarde du coin de l'oeil.
widget.refreshAfterDate = new Date(Date.now() + 10 * 60 * 1000)

if (config.runsInWidget) Script.setWidget(widget)
else await widget.presentMedium()
Script.complete()
