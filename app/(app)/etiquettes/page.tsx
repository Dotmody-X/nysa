'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Barcode, Plus, Search, Trash2, Pencil, X, AlertTriangle, Check, Upload, ExternalLink, Copy,
  ChevronUp, ChevronDown,
} from '@/components/ui/icons'
import { PageTitle, KpiGrid, KpiCard, SectionCard, StickerButton } from '@/components/ui/PageTitle'
import { useEtiquettes } from '@/hooks/useEtiquettes'
import { santeCode, type SanteCode } from '@/lib/ean'
import type {
  EtatFichier, EtiquetteCommande, CommandeEtiquetteStatut,
  EtiquetteFichier, EtiquetteFichierCategorie, EtiquetteFormat, EtiquetteGamme,
} from '@/types'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ACCENT = 'var(--accent-etiquettes)'

const ETATS: Record<EtatFichier, { label: string; court: string; couleur: string }> = {
  a_jour:            { label: 'À jour',            court: 'À jour',  couleur: 'var(--accent-sport)' },
  modifie:           { label: 'Fichier à envoyer', court: 'À envoyer', couleur: 'var(--accent-recettes)' },
  changement_envoye: { label: 'Changement envoyé', court: 'Envoyé',  couleur: 'var(--accent-calendar)' },
}

const SANTE: Record<SanteCode, { label: string; couleur: string; aide: string }> = {
  absent:       { label: '—',          couleur: 'var(--bg-input)',        aide: 'Aucun code saisi' },
  conforme:     { label: 'Conforme',   couleur: 'var(--accent-sport)',    aide: 'Clé juste, préfixe de la marque, code unique' },
  cle_invalide: { label: 'Clé fausse', couleur: 'var(--accent-recettes)', aide: 'Le 13e chiffre ne correspond pas — le code ne passera pas en caisse' },
  prefixe:      { label: 'Hors 370/376', couleur: 'var(--accent-todo)',   aide: 'Préfixe non attribué à la marque' },
  partage:      { label: 'Partagé',    couleur: 'var(--accent-clients)',  aide: 'Le même code se trouve sur au moins deux références' },
}

const STATUTS: { value: CommandeEtiquetteStatut; label: string; couleur: string }[] = [
  { value: 'brouillon',     label: 'Brouillon',     couleur: 'var(--bg-input)' },
  { value: 'confirmee',     label: 'Confirmée',     couleur: 'var(--accent-calendar)' },
  { value: 'en_production', label: 'En production', couleur: 'var(--accent-todo)' },
  { value: 'recue',         label: 'Reçue',         couleur: 'var(--accent-sport)' },
  { value: 'annulee',       label: 'Annulée',       couleur: 'var(--accent-recettes)' },
]

const champ: React.CSSProperties = {
  padding: '7px 9px', fontSize: 13, color: 'var(--text)',
  background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 8,
}
const cellule: React.CSSProperties = {
  padding: '5px 8px', borderBottom: '1px solid var(--border)', fontSize: 12, textAlign: 'left',
}
const entete: React.CSSProperties = {
  ...cellule, ...DF, fontWeight: 800, fontSize: 11, textTransform: 'uppercase',
  letterSpacing: .4, color: 'var(--text-muted)', borderBottom: '2px solid var(--ink)',
  position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1,
}

/** Saisie directe du code-barres, enregistrée à la sortie du champ. */
function ChampCode({ valeur, sante, portee, onEnregistrer }: {
  valeur?: string
  sante: SanteCode
  portee: number
  onEnregistrer: (v: string | null) => void
}) {
  const [texte, setTexte] = useState(valeur ?? '')
  useEffect(() => { setTexte(valeur ?? '') }, [valeur])
  const s = SANTE[sante]
  return (
    <span className="flex items-center gap-1">
      <input value={texte} inputMode="numeric" placeholder="—" maxLength={14}
             onChange={ev => setTexte(ev.target.value.replace(/\D/g, ''))}
             onBlur={() => { if ((valeur ?? '') !== texte) onEnregistrer(texte || null) }}
             onKeyDown={ev => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur() }}
             style={{ width: 112, padding: '2px 5px', fontSize: 11, textAlign: 'right',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      color: 'var(--text)', background: 'var(--bg-input)',
                      border: '1px solid var(--ink)', borderRadius: 5 }} />
      <span title={portee > 1 ? `${s.aide} (${portee} références)` : s.aide}
            style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999,
                     border: '2px solid var(--ink)', background: s.couleur,
                     color: 'var(--ink-dark)', whiteSpace: 'nowrap' }}>
        {s.label}{portee > 1 ? ` ×${portee}` : ''}
      </span>
    </span>
  )
}

function Etat({ e }: { e: EtatFichier }) {
  const s = ETATS[e]
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                   border: '2px solid var(--ink)', background: s.couleur,
                   color: 'var(--ink-dark)', whiteSpace: 'nowrap' }}>
      {s.court}
    </span>
  )
}

function Fichier({ f, lien, onSupprimer }: {
  f: EtiquetteFichier
  lien: (f: EtiquetteFichier) => Promise<string | null>
  onSupprimer: (f: EtiquetteFichier) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let vivant = true
    lien(f).then(u => { if (vivant) setUrl(u) })
    return () => { vivant = false }
  }, [f.id]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className="flex items-center gap-1" style={{ fontSize: 11, padding: '3px 7px',
                     border: '2px solid var(--ink)', borderRadius: 999 }}>
      <strong>{f.categorie === 'bat' ? 'BAT' : f.categorie === 'facture' ? 'Facture' : 'Fichier'}</strong>
      <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {f.filename}
      </span>
      {url && <a href={url} target="_blank" rel="noreferrer" title="Ouvrir"><ExternalLink size={10} /></a>}
      <button onClick={() => onSupprimer(f)} title="Supprimer"><Trash2 size={10} /></button>
    </span>
  )
}

function Depot({ commandeId, categorie, label, onEnvoi }: {
  commandeId: string
  categorie: EtiquetteFichierCategorie
  label: string
  onEnvoi: (id: string, f: File, c: EtiquetteFichierCategorie) => Promise<{ error: unknown }>
}) {
  const input = useRef<HTMLInputElement>(null)
  const [enCours, setEnCours] = useState(false)
  return (
    <>
      <input ref={input} type="file" hidden accept="application/pdf,image/png,image/jpeg,image/webp"
             onChange={async ev => {
               const f = ev.target.files?.[0]
               if (!f) return
               setEnCours(true); await onEnvoi(commandeId, f, categorie); setEnCours(false)
               ev.target.value = ''
             }} />
      <button onClick={() => input.current?.click()} disabled={enCours}
              style={{ ...DF, fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 6,
                       border: '2px solid var(--ink)', background: 'var(--bg-card)', color: 'var(--text)' }}>
        <Upload size={10} /> {enCours ? 'Envoi…' : label}
      </button>
    </>
  )
}

/**
 * Le texte à envoyer à l'imprimeur.
 *
 * Une commande peut porter plusieurs formats : chacun ouvre sa section avec sa
 * spécification technique intégrale, puisque c'est elle qui décrit le support à
 * produire. Suivent ses saveurs et leurs quantités.
 *
 * Les fichiers à joindre sont listés à part : l'imprimeur conserve les autres,
 * et c'est le seul point où une omission coûte un retirage entier.
 */
function texteCommande(
  c: EtiquetteCommande,
  formats: { id: string; libelle: string; specification: string; dimensions: string }[],
): string {
  const parFormat = new Map<string, { saveur: string; quantite: number; aEnvoyer: boolean }[]>()
  for (const l of c.lignes ?? []) {
    const fid = l.etiquette?.format_id
    if (!fid) continue
    const liste = parFormat.get(fid) ?? []
    liste.push({
      saveur: l.etiquette?.saveur ?? '—',
      quantite: l.quantite,
      aEnvoyer: l.fichier_envoye || l.etiquette?.etat_fichier === 'modifie',
    })
    parFormat.set(fid, liste)
  }

  const lignes: string[] = ['Bonjour,', '']
  lignes.push(c.reference
    ? `Merci de préparer le retirage suivant (${c.reference}) :`
    : 'Merci de préparer le retirage suivant :')

  let total = 0
  const aJoindre: string[] = []

  for (const [fid, items] of parFormat) {
    const f = formats.find(x => x.id === fid)
    lignes.push('', (f?.libelle ?? 'Format inconnu').toUpperCase())
    if (f?.specification) lignes.push(f.specification)
    else if (f?.dimensions) lignes.push(`Format : ${f.dimensions}`)
    lignes.push('')

    const largeur = Math.max(...items.map(i => i.saveur.length), 10)
    for (const i of items.sort((a, b) => a.saveur.localeCompare(b.saveur, 'fr'))) {
      lignes.push(`  ${i.saveur.padEnd(largeur, ' ')}  ${String(i.quantite).padStart(6, ' ')}`)
      total += i.quantite
      if (i.aEnvoyer) aJoindre.push(`${i.saveur} (${f?.libelle ?? ''})`)
    }
  }

  lignes.push('', `Total : ${total.toLocaleString('fr-BE')} étiquettes`)

  if (aJoindre.length) {
    lignes.push('', 'Fichiers joints — ces visuels ont changé depuis le dernier tirage :')
    for (const x of aJoindre) lignes.push(`  · ${x}`)
    lignes.push('', 'Les autres fichiers sont déjà en votre possession, inchangés.')
  } else {
    lignes.push('', 'Aucun fichier à joindre : tous les visuels sont inchangés depuis le dernier tirage.')
  }

  lignes.push('', 'Merci d’avance,')
  return lignes.join('\n')
}

function Recapitulatif({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false)
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div className="flex items-center justify-between gap-2">
        <p style={{ ...DF, fontWeight: 800, fontSize: 12 }}>Message pour l’imprimeur</p>
        <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
          await navigator.clipboard.writeText(texte)
          setCopie(true)
          setTimeout(() => setCopie(false), 1600)
        }}>
          {copie ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
        </StickerButton>
      </div>
      <pre style={{ margin: 0, padding: 10, fontSize: 11, lineHeight: 1.5,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    background: 'var(--bg-input)', border: '2px solid var(--ink)',
                    borderRadius: 8, maxHeight: 320, overflowY: 'auto' }}>
        {texte}
      </pre>
    </div>
  )
}

export default function EtiquettesPage() {
  const e = useEtiquettes()
  const [onglet, setOnglet] = useState<'etiquettes' | 'formats' | 'commandes'>('etiquettes')
  const [editFormat, setEditFormat] = useState<Partial<EtiquetteFormat> | null>(null)
  const [editGamme, setEditGamme] = useState<Partial<EtiquetteGamme> | null>(null)
  const [souciFormat, setSouciFormat] = useState<string | null>(null)
  const [souciGamme, setSouciGamme] = useState<string | null>(null)

  // ── Table des étiquettes ────────────────────────────────────────────────
  const [recherche, setRecherche] = useState('')
  const [fGamme, setFGamme] = useState('')
  const [fFormat, setFFormat] = useState('')
  const [fEtat, setFEtat] = useState<EtatFichier | ''>('')
  const [fSante, setFSante] = useState<SanteCode | ''>('')
  const [saveurNouvelle, setSaveurNouvelle] = useState('')

  // ── Grille de commande ──────────────────────────────────────────────────
  const [cmdOuverte, setCmdOuverte] = useState<string | null>(null)
  const [grilleFormat, setGrilleFormat] = useState('')
  const [quantites, setQuantites] = useState<Record<string, string>>({})
  const [enregistrement, setEnregistrement] = useState(false)
  const [edition, setEdition] = useState<Partial<EtiquetteCommande> | null>(null)

  /** Toutes les étiquettes à plat : c'est la forme que la table demande. */
  const lignes = useMemo(
    () => e.gammes.flatMap(g => g.formats.flatMap(f => f.etiquettes.map(x => ({
      ...x,
      gammeNom: g.nom,
      formatNom: `${f.contenance}${f.variante ? ` · ${f.variante}` : ''}`,
      dimensions: f.dimensions ?? '',
      formatId: f.id,
    })))),
    [e.gammes])

  const formatsAplat = useMemo(
    () => e.gammes.flatMap(g => g.formats.map(f => ({
      id: f.id,
      libelle: `${g.nom} · ${f.contenance}${f.variante ? ` ${f.variante}` : ''}`,
      dimensions: f.dimensions ?? '',
      specification: f.specification ?? '',
      nb: f.etiquettes.length,
    }))),
    [e.gammes])

  /** Combien de références portent chaque code : un EAN doit être unique. */
  const portees = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of lignes) if (x.code_barre) m.set(x.code_barre, (m.get(x.code_barre) ?? 0) + 1)
    return m
  }, [lignes])

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return lignes.filter(x =>
      (!fGamme  || x.gammeNom === fGamme) &&
      (!fFormat || x.formatId === fFormat) &&
      (!fEtat   || x.etat_fichier === fEtat) &&
      (!fSante  || santeCode(x.code_barre, portees.get(x.code_barre ?? '') ?? 0) === fSante) &&
      (!q || `${x.saveur} ${x.gammeNom} ${x.formatNom} ${x.dimensions} ${x.code_barre ?? ''}`.toLowerCase().includes(q)))
  }, [lignes, recherche, fGamme, fFormat, fEtat, fSante, portees])

  const aRenvoyer = lignes.filter(x => x.etat_fichier === 'modifie')
  const codesDefectueux = lignes.filter(x =>
    santeCode(x.code_barre, portees.get(x.code_barre ?? '') ?? 0) === 'cle_invalide').length

  /** Saveurs du format choisi, dans l'ordre — la grille reprend le bon papier. */
  const grille = useMemo(
    () => lignes.filter(x => x.formatId === grilleFormat)
                .sort((a, b) => a.saveur.localeCompare(b.saveur, 'fr')),
    [lignes, grilleFormat])

  /** À l'ouverture d'une commande, la grille se pré-remplit de ses lignes. */
  function ouvrirCommande(c: EtiquetteCommande) {
    if (cmdOuverte === c.id) { setCmdOuverte(null); return }
    setCmdOuverte(c.id)
    const depart: Record<string, string> = {}
    for (const l of c.lignes ?? []) depart[l.etiquette_id] = String(l.quantite)
    setQuantites(depart)
    const premier = (c.lignes ?? [])[0]
    setGrilleFormat(premier?.etiquette?.format_id ?? formatsAplat[0]?.id ?? '')
  }

  const totalSaisi = Object.values(quantites).reduce((s, v) => s + (Number(v) || 0), 0)

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Étiquettes"
        sub="Formats par gamme · bons de commande · BAT et factures"
        accent={ACCENT} icon={Barcode} iconInk="var(--ink-light)"
      />

      <KpiGrid>
        <KpiCard label="Étiquettes" value={String(lignes.length)} accent={ACCENT} />
        <KpiCard label="Formats"    value={String(formatsAplat.length)} accent={ACCENT} />
        <KpiCard label="Codes fautifs" value={String(codesDefectueux)} sub="clé EAN invalide"
                 accent={codesDefectueux ? 'var(--accent-recettes)' : ACCENT} />
        <KpiCard label="À renvoyer" value={String(aRenvoyer.length)} sub="fichier modifié"
                 accent={aRenvoyer.length ? 'var(--accent-recettes)' : ACCENT} />
      </KpiGrid>

      {aRenvoyer.length > 0 && (
        <div style={{ padding: 10, border: '2px solid var(--ink)', borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-recettes)', color: 'var(--ink-dark)',
                      boxShadow: '4px 4px 0 var(--ink)', fontSize: 12 }}>
          <p className="flex items-center gap-2" style={{ ...DF, fontWeight: 800, fontSize: 13 }}>
            <AlertTriangle size={14} />
            {aRenvoyer.length} fichier{aRenvoyer.length > 1 ? 's' : ''} à envoyer à l’imprimeur
          </p>
          <p>{aRenvoyer.slice(0, 14).map(x => x.saveur).join(' · ')}
             {aRenvoyer.length > 14 && ` … +${aRenvoyer.length - 14}`}</p>
        </div>
      )}

      <div className="flex gap-2">
        {([['etiquettes', `Étiquettes (${lignes.length})`],
           ['formats',    `Gammes et formats (${formatsAplat.length})`],
           ['commandes',  `Commandes (${e.commandes.length})`]] as const).map(([o, l]) => (
          <StickerButton key={o} tilt="none"
                         accent={onglet === o ? ACCENT : 'var(--bg-input)'}
                         ink={onglet === o ? undefined : 'var(--text)'}
                         onClick={() => setOnglet(o)}>{l}</StickerButton>
        ))}
      </div>

      {onglet === 'etiquettes' && (
        <SectionCard title="Toutes les étiquettes" accent={ACCENT}>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 10 }}>
            <div className="flex items-center gap-2" style={{ ...champ, flex: '1 1 200px' }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input value={recherche} onChange={ev => setRecherche(ev.target.value)}
                     placeholder="Saveur, gamme, format, code-barres…"
                     style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: 'var(--text)' }} />
            </div>
            <select value={fGamme} onChange={ev => setFGamme(ev.target.value)} style={champ}>
              <option value="">Toutes les gammes</option>
              {e.gammes.map(g => <option key={g.id} value={g.nom}>{g.nom}</option>)}
            </select>
            <select value={fFormat} onChange={ev => setFFormat(ev.target.value)} style={champ}>
              <option value="">Tous les formats</option>
              {formatsAplat.map(f => <option key={f.id} value={f.id}>{f.libelle}</option>)}
            </select>
            <select value={fSante} onChange={ev => setFSante(ev.target.value as SanteCode | '')} style={champ}>
              <option value="">Tous les codes</option>
              {(Object.keys(SANTE) as SanteCode[]).map(k => <option key={k} value={k}>{SANTE[k].label}</option>)}
            </select>
            <select value={fEtat} onChange={ev => setFEtat(ev.target.value as EtatFichier | '')} style={champ}>
              <option value="">Tous les états</option>
              {(Object.keys(ETATS) as EtatFichier[]).map(k => <option key={k} value={k}>{ETATS[k].label}</option>)}
            </select>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            {visibles.length} sur {lignes.length}
          </p>

          <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '2px solid var(--ink)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={entete}>Saveur</th>
                  <th style={entete}>Gamme</th>
                  <th style={entete}>Format</th>
                  <th style={entete}>Dimensions</th>
                  <th style={entete}>Code-barres</th>
                  <th style={entete}>État</th>
                  <th style={entete}>Dernière commande</th>
                  <th style={{ ...entete, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(x => (
                  <tr key={x.id} style={{ background: x.etat_fichier === 'modifie' ? 'var(--bg-input)' : undefined }}>
                    <td style={{ ...cellule, fontWeight: 700 }}>{x.saveur}</td>
                    <td style={{ ...cellule, color: 'var(--text-muted)' }}>{x.gammeNom}</td>
                    <td style={cellule}>{x.formatNom}</td>
                    <td style={{ ...cellule, color: 'var(--text-muted)', fontSize: 11 }}>{x.dimensions}</td>
                    <td style={{ ...cellule, whiteSpace: 'nowrap' }}>
                      <ChampCode valeur={x.code_barre}
                                 portee={portees.get(x.code_barre ?? '') ?? 0}
                                 sante={santeCode(x.code_barre, portees.get(x.code_barre ?? '') ?? 0)}
                                 onEnregistrer={v => e.modifierEtiquette(x.id, { code_barre: v ?? undefined })} />
                    </td>
                    <td style={cellule}><Etat e={x.etat_fichier} /></td>
                    <td style={{ ...cellule, color: 'var(--text-muted)' }}>
                      {x.derniere_commande ?? '—'}
                    </td>
                    <td style={{ ...cellule, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {x.etat_fichier === 'modifie' ? (
                        <button title="Le fichier est à jour, annuler le signalement"
                                onClick={() => e.marquerEtat(x.id, 'a_jour')}
                                style={{ padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                          <Check size={11} />
                        </button>
                      ) : (
                        <button title="Signaler un changement de visuel"
                                onClick={() => e.marquerEtat(x.id, 'modifie')}
                                style={{ padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                          <AlertTriangle size={11} />
                        </button>
                      )}
                      <button title="Supprimer" style={{ marginLeft: 4, padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}
                              onClick={async () => { if (confirm(`Supprimer « ${x.saveur} » ?`)) await e.supprimerEtiquette(x.id) }}>
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {fFormat && (
            <div className="flex gap-2" style={{ marginTop: 10 }}>
              <input value={saveurNouvelle} onChange={ev => setSaveurNouvelle(ev.target.value)}
                     placeholder="Ajouter une saveur à ce format…" style={{ ...champ, flex: '1 1 240px' }} />
              <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
                if (!saveurNouvelle.trim()) return
                await e.ajouterEtiquette(fFormat, saveurNouvelle.trim())
                setSaveurNouvelle('')
              }}><Plus size={12} /> Ajouter</StickerButton>
            </div>
          )}
        </SectionCard>
      )}

      {onglet === 'formats' && (
        <SectionCard
          title="Gammes et formats" accent={ACCENT}
          action={
            <span className="flex gap-2">
              <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none"
                             onClick={() => setEditGamme({ nom: '', ordre: (e.gammes.at(-1)?.ordre ?? 0) + 10 })}>
                <Plus size={13} /> Gamme
              </StickerButton>
              <StickerButton accent={ACCENT}
                             onClick={() => setEditFormat({ gamme_id: e.gammes[0]?.id, contenance: '',
                                            ordre: ((e.gammes[0]?.formats.at(-1)?.ordre) ?? 0) + 10 })}>
                <Plus size={13} /> Format
              </StickerButton>
            </span>
          }
        >
          <div style={{ overflowX: 'auto', border: '2px solid var(--ink)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={entete}>Gamme</th>
                  <th style={entete}>Contenance</th>
                  <th style={entete}>Variante</th>
                  <th style={entete}>Dimensions</th>
                  <th style={entete}>Spécification</th>
                  <th style={{ ...entete, textAlign: 'right' }}>Saveurs</th>
                  <th style={{ ...entete, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {e.gammes.flatMap(g => g.formats.length === 0
                  ? [(
                      <tr key={g.id}>
                        <td style={{ ...cellule, fontWeight: 700 }}>{g.nom}</td>
                        <td style={{ ...cellule, color: 'var(--text-muted)' }} colSpan={5}>
                          Aucun format renseigné.
                        </td>
                        <td style={{ ...cellule, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button title="Ajouter un format à cette gamme"
                                  onClick={() => setEditFormat({ gamme_id: g.id, contenance: '',
                                                          ordre: ((g.formats.at(-1)?.ordre) ?? 0) + 10 })}
                                  style={{ padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                            <Plus size={11} />
                          </button>
                          <button title="Renommer la gamme" onClick={() => setEditGamme({ ...g })}
                                  style={{ marginLeft: 4, padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                            <Pencil size={11} />
                          </button>
                          <button title="Supprimer la gamme"
                                  onClick={async () => { if (confirm(`Supprimer la gamme « ${g.nom} » ?`)) await e.supprimerGamme(g.id) }}
                                  style={{ marginLeft: 4, padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    )]
                  : g.formats.map((f, i) => (
                      <tr key={f.id}>
                        <td style={{ ...cellule, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {i === 0 && (
                            <span className="flex items-center gap-1">
                              {g.nom}
                              <button title="Modifier la gamme" onClick={() => setEditGamme({ ...g })}
                                      style={{ padding: 1, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                                <Pencil size={9} />
                              </button>
                              <button title="Supprimer la gamme et ses formats"
                                      onClick={async () => {
                                        if (confirm(`Supprimer « ${g.nom} » et ses ${g.formats.length} formats ?`)) await e.supprimerGamme(g.id)
                                      }}
                                      style={{ padding: 1, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                                <Trash2 size={9} />
                              </button>
                            </span>
                          )}
                        </td>
                        <td style={{ ...cellule, whiteSpace: 'nowrap' }}>
                          <span className="flex items-center gap-1">
                            <span className="flex flex-col" style={{ gap: 1 }}>
                              <button title="Monter" disabled={i === 0}
                                      onClick={() => e.deplacerFormat(f.id, -1)}
                                      style={{ padding: 0, lineHeight: 0, border: '1px solid var(--ink)', borderRadius: 3,
                                               background: 'var(--bg-card)', opacity: i === 0 ? .3 : 1 }}>
                                <ChevronUp size={9} />
                              </button>
                              <button title="Descendre" disabled={i === g.formats.length - 1}
                                      onClick={() => e.deplacerFormat(f.id, 1)}
                                      style={{ padding: 0, lineHeight: 0, border: '1px solid var(--ink)', borderRadius: 3,
                                               background: 'var(--bg-card)', opacity: i === g.formats.length - 1 ? .3 : 1 }}>
                                <ChevronDown size={9} />
                              </button>
                            </span>
                            {f.contenance}
                          </span>
                        </td>
                        <td style={{ ...cellule, color: 'var(--text-muted)' }}>{f.variante ?? '—'}</td>
                        <td style={cellule}>{f.dimensions ?? '—'}</td>
                        <td style={{ ...cellule, color: 'var(--text-muted)', fontSize: 11, maxWidth: 320 }}>
                          {f.specification ?? '—'}
                        </td>
                        <td style={{ ...cellule, textAlign: 'right' }}>{f.etiquettes.length}</td>
                        <td style={{ ...cellule, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button title="Modifier" onClick={() => setEditFormat({ ...f })}
                                  style={{ padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                            <Pencil size={11} />
                          </button>
                          <button title="Supprimer" style={{ marginLeft: 4, padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}
                                  onClick={async () => {
                                    const n = f.etiquettes.length
                                    const avertissement = n
                                      ? `Supprimer ce format et ses ${n} étiquettes ?`
                                      : 'Supprimer ce format ?'
                                    if (confirm(avertissement)) await e.supprimerFormat(f.id)
                                  }}>
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    )))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Supprimer un format emporte ses étiquettes, et supprimer une gamme emporte ses formats.
          </p>
        </SectionCard>
      )}

      {onglet === 'commandes' && (
        <SectionCard
          title="Bons de commande" accent={ACCENT}
          action={
            <StickerButton accent={ACCENT} onClick={() => setEdition({ statut: 'brouillon', date_commande: new Date().toISOString().slice(0, 10) })}>
              <Plus size={13} /> Nouvelle commande
            </StickerButton>
          }
        >
          {e.commandes.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune commande.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {e.commandes.map(c => {
                const st = STATUTS.find(s => s.value === c.statut) ?? STATUTS[0]
                const alerte = (c.lignes ?? []).filter(l => l.etiquette?.etat_fichier === 'modifie')
                const total = (c.lignes ?? []).reduce((s, l) => s + l.quantite, 0)
                const ouverte = cmdOuverte === c.id
                return (
                  <div key={c.id} style={{ border: '2px solid var(--ink)', borderRadius: 'var(--radius-md)',
                                           background: 'var(--bg-card)', overflow: 'hidden' }}>
                    <div className="flex items-center justify-between gap-3" style={{ padding: '10px 12px', cursor: 'pointer' }}
                         onClick={() => ouvrirCommande(c)}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ ...DF, fontWeight: 800, fontSize: 13 }}>
                          {c.reference || 'Sans référence'}
                          {c.imprimeur && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {c.imprimeur}</span>}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {c.date_commande ?? 'sans date'} · {(c.lignes ?? []).length} références · {total} étiquettes
                          {c.numero_facture ? ` · facture ${c.numero_facture}` : ''}
                        </p>
                      </div>
                      <span className="flex items-center gap-2">
                        {alerte.length > 0 && (
                          <span className="flex items-center gap-1" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px',
                                         borderRadius: 999, border: '2px solid var(--ink)',
                                         background: 'var(--accent-recettes)', color: 'var(--ink-dark)' }}>
                            <AlertTriangle size={10} /> {alerte.length}
                          </span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                                       border: '2px solid var(--ink)', background: st.couleur, color: 'var(--ink-dark)' }}>
                          {st.label}
                        </span>
                      </span>
                    </div>

                    {ouverte && (
                      <div style={{ borderTop: '2px solid var(--ink)', padding: 12, display: 'grid', gap: 10 }}>
                        {alerte.length > 0 && c.statut === 'brouillon' && (
                          <p style={{ fontSize: 12, padding: 8, border: '2px solid var(--ink)', borderRadius: 8,
                                      background: 'var(--accent-recettes)', color: 'var(--ink-dark)' }}>
                            <strong>Joindre les fichiers</strong> — {alerte.map(l => l.etiquette?.saveur).join(', ')}.
                            À la confirmation, ces étiquettes passeront en « changement envoyé ».
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <select value={grilleFormat} onChange={ev => setGrilleFormat(ev.target.value)}
                                  style={{ ...champ, flex: '1 1 280px' }}>
                            <option value="">— choisir un format —</option>
                            {formatsAplat.map(f => (
                              <option key={f.id} value={f.id}>{f.libelle} — {f.nb} saveurs</option>
                            ))}
                          </select>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {totalSaisi} étiquette{totalSaisi > 1 ? 's' : ''} saisie{totalSaisi > 1 ? 's' : ''}
                          </span>
                          <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
                            setEnregistrement(true)
                            const n: Record<string, number> = {}
                            for (const [k, v] of Object.entries(quantites)) n[k] = Number(v) || 0
                            await e.enregistrerQuantites(c.id, n)
                            setEnregistrement(false)
                          }}>
                            {enregistrement ? 'Enregistrement…' : 'Enregistrer les quantités'}
                          </StickerButton>
                        </div>

                        {grille.length > 0 ? (
                          <div style={{ display: 'grid', gap: 0,
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                                        border: '2px solid var(--ink)', borderRadius: 8, overflow: 'hidden' }}>
                            {grille.map(x => {
                              const alerteLigne = x.etat_fichier === 'modifie'
                              return (
                                <label key={x.id}
                                       className="flex items-center justify-between gap-2"
                                       style={{ padding: '4px 8px', borderBottom: '1px solid var(--border)',
                                                borderRight: '1px solid var(--border)', fontSize: 12,
                                                background: alerteLigne ? 'var(--bg-input)' : undefined }}>
                                  <span className="flex items-center gap-1" style={{ minWidth: 0 }}>
                                    {alerteLigne && <AlertTriangle size={10} style={{ color: 'var(--accent-recettes)', flexShrink: 0 }} />}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {x.saveur}
                                    </span>
                                  </span>
                                  <input type="number" min={0} inputMode="numeric"
                                         value={quantites[x.id] ?? ''}
                                         onChange={ev => setQuantites({ ...quantites, [x.id]: ev.target.value })}
                                         style={{ width: 66, padding: '3px 5px', fontSize: 12, textAlign: 'right',
                                                  color: 'var(--text)', background: 'var(--bg-input)',
                                                  border: '1px solid var(--ink)', borderRadius: 5 }} />
                                </label>
                              )
                            })}
                          </div>
                        ) : (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Choisis un format pour afficher ses saveurs et saisir les quantités.
                          </p>
                        )}

                        {(c.lignes ?? []).length > 0 && (
                          <Recapitulatif texte={texteCommande(c, formatsAplat)} />
                        )}

                        {!!c.fichiers?.length && (
                          <div className="flex flex-wrap gap-2">
                            {c.fichiers.map(f => (
                              <Fichier key={f.id} f={f} lien={e.lien} onSupprimer={e.supprimerFichier} />
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <Depot commandeId={c.id} categorie="bat" label="BAT" onEnvoi={e.televerser} />
                          <Depot commandeId={c.id} categorie="facture" label="Facture" onEnvoi={e.televerser} />
                          <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none" onClick={() => setEdition({ ...c })}>
                            <Pencil size={12} /> Modifier
                          </StickerButton>
                          <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none" onClick={async () => {
                            if (confirm(`Supprimer « ${c.reference || 'sans référence'} » ?`)) await e.supprimerCommande(c.id)
                          }}>
                            <Trash2 size={12} /> Supprimer
                          </StickerButton>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      )}

      {editFormat && (
        <div onClick={() => setEditFormat(null)}
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 60 }}>
          <div onClick={ev => ev.stopPropagation()}
               style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)',
                        boxShadow: '6px 6px 0 var(--ink)', padding: 20, width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <p style={{ ...DF, fontWeight: 800, fontSize: 15 }}>
                {editFormat.id ? 'Modifier le format' : 'Nouveau format'}
              </p>
              <button onClick={() => setEditFormat(null)}
                      style={{ padding: 5, border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--bg-card)' }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Gamme *
                <select value={editFormat.gamme_id ?? ''}
                        onChange={ev => setEditFormat({ ...editFormat, gamme_id: ev.target.value })}
                        style={{ ...champ, width: '100%', marginTop: 4 }}>
                  {e.gammes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                </select></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Contenance *
                  <input autoFocus value={editFormat.contenance ?? ''} placeholder="30 ml"
                         onChange={ev => setEditFormat({ ...editFormat, contenance: ev.target.value })}
                         style={{ ...champ, width: '100%', marginTop: 4 }} /></label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Variante
                  <input value={editFormat.variante ?? ''} placeholder="avec livret"
                         onChange={ev => setEditFormat({ ...editFormat, variante: ev.target.value || undefined })}
                         style={{ ...champ, width: '100%', marginTop: 4 }} />
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                    À remplir seulement si la même contenance existe en deux déclinaisons.
                  </span></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Dimensions
                  <input value={editFormat.dimensions ?? ''} placeholder="167 x 90 mm"
                         onChange={ev => setEditFormat({ ...editFormat, dimensions: ev.target.value || undefined })}
                         style={{ ...champ, width: '100%', marginTop: 4 }} /></label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Rang
                  <input type="number" value={editFormat.ordre ?? 0}
                         onChange={ev => setEditFormat({ ...editFormat, ordre: Number(ev.target.value) })}
                         style={{ ...champ, width: '100%', marginTop: 4 }} />
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                    Petit d’abord. Les flèches du tableau font la même chose.
                  </span></label>
              </div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Spécification pour l’imprimeur
                <textarea rows={4} value={editFormat.specification ?? ''}
                          placeholder="pp transparent avec blanc de soutien - NORMAL - Sens de sortie : gauche en avant"
                          onChange={ev => setEditFormat({ ...editFormat, specification: ev.target.value || undefined })}
                          style={{ ...champ, width: '100%', marginTop: 4, resize: 'vertical' }} /></label>
            </div>
            {souciFormat && (
              <p style={{ marginTop: 10, fontSize: 12, padding: 8, borderRadius: 8,
                          border: '2px solid var(--ink)', background: 'var(--accent-recettes)', color: 'var(--ink-dark)' }}>
                {souciFormat}
              </p>
            )}
            <div className="flex justify-end gap-2" style={{ marginTop: 16 }}>
              <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none" onClick={() => { setSouciFormat(null); setEditFormat(null) }}>
                Annuler
              </StickerButton>
              <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
                if (!editFormat.gamme_id || !editFormat.contenance?.trim()) {
                  setSouciFormat('La gamme et la contenance sont obligatoires.')
                  return
                }
                const { error } = await e.enregistrerFormat(editFormat as EtiquetteFormat)
                if (error) { setSouciFormat(error.message); return }
                setSouciFormat(null)
                setEditFormat(null)
              }}>
                {editFormat.id ? 'Enregistrer' : 'Créer'}
              </StickerButton>
            </div>
          </div>
        </div>
      )}

      {editGamme && (
        <div onClick={() => setEditGamme(null)}
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 60 }}>
          <div onClick={ev => ev.stopPropagation()}
               style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)',
                        boxShadow: '6px 6px 0 var(--ink)', padding: 20, width: 'min(420px, 100%)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <p style={{ ...DF, fontWeight: 800, fontSize: 15 }}>
                {editGamme.id ? 'Modifier la gamme' : 'Nouvelle gamme'}
              </p>
              <button onClick={() => setEditGamme(null)}
                      style={{ padding: 5, border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--bg-card)' }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Nom *
                <input autoFocus value={editGamme.nom ?? ''}
                       onChange={ev => setEditGamme({ ...editGamme, nom: ev.target.value })}
                       style={{ ...champ, width: '100%', marginTop: 4 }} /></label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Ordre d’affichage
                <input type="number" value={editGamme.ordre ?? 0}
                       onChange={ev => setEditGamme({ ...editGamme, ordre: Number(ev.target.value) })}
                       style={{ ...champ, width: '100%', marginTop: 4 }} /></label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Notes
                <textarea rows={2} value={editGamme.notes ?? ''}
                          onChange={ev => setEditGamme({ ...editGamme, notes: ev.target.value || undefined })}
                          style={{ ...champ, width: '100%', marginTop: 4, resize: 'vertical' }} /></label>
            </div>
            {souciGamme && (
              <p style={{ marginTop: 10, fontSize: 12, padding: 8, borderRadius: 8,
                          border: '2px solid var(--ink)', background: 'var(--accent-recettes)', color: 'var(--ink-dark)' }}>
                {souciGamme}
              </p>
            )}
            <div className="flex justify-end gap-2" style={{ marginTop: 16 }}>
              <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none" onClick={() => { setSouciGamme(null); setEditGamme(null) }}>
                Annuler
              </StickerButton>
              <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
                if (!editGamme.nom?.trim()) { setSouciGamme('Le nom est obligatoire.'); return }
                const { error } = await e.enregistrerGamme(editGamme as EtiquetteGamme)
                if (error) { setSouciGamme(error.message); return }
                setSouciGamme(null)
                setEditGamme(null)
              }}>
                {editGamme.id ? 'Enregistrer' : 'Créer'}
              </StickerButton>
            </div>
          </div>
        </div>
      )}

      {edition && (
        <div onClick={() => setEdition(null)}
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 60 }}>
          <div onClick={ev => ev.stopPropagation()}
               style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)',
                        boxShadow: '6px 6px 0 var(--ink)', padding: 20, width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <p style={{ ...DF, fontWeight: 800, fontSize: 15 }}>
                {edition.id ? 'Modifier la commande' : 'Nouvelle commande'}
              </p>
              <button onClick={() => setEdition(null)}
                      style={{ padding: 5, border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--bg-card)' }}>
                <X size={13} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Référence
                  <input value={edition.reference ?? ''} onChange={ev => setEdition({ ...edition, reference: ev.target.value })}
                         style={{ ...champ, width: '100%', marginTop: 4 }} /></label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Imprimeur
                  <input value={edition.imprimeur ?? ''} onChange={ev => setEdition({ ...edition, imprimeur: ev.target.value })}
                         style={{ ...champ, width: '100%', marginTop: 4 }} /></label>
              </div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Statut
                <select value={edition.statut ?? 'brouillon'}
                        onChange={ev => setEdition({ ...edition, statut: ev.target.value as CommandeEtiquetteStatut })}
                        style={{ ...champ, width: '100%', marginTop: 4 }}>
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                  Passer en « Confirmée » bascule les étiquettes modifiées en « changement envoyé ».
                </span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Commandée le
                  <input type="date" value={edition.date_commande ?? ''}
                         onChange={ev => setEdition({ ...edition, date_commande: ev.target.value || undefined })}
                         style={{ ...champ, width: '100%', marginTop: 4 }} /></label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Reçue le
                  <input type="date" value={edition.date_reception ?? ''}
                         onChange={ev => setEdition({ ...edition, date_reception: ev.target.value || undefined })}
                         style={{ ...champ, width: '100%', marginTop: 4 }} /></label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>N° de facture
                  <input value={edition.numero_facture ?? ''} onChange={ev => setEdition({ ...edition, numero_facture: ev.target.value })}
                         style={{ ...champ, width: '100%', marginTop: 4 }} /></label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Montant €
                  <input type="number" step="0.01" value={edition.montant ?? ''}
                         onChange={ev => setEdition({ ...edition, montant: ev.target.value ? Number(ev.target.value) : undefined })}
                         style={{ ...champ, width: '100%', marginTop: 4 }} /></label>
              </div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Notes
                <textarea rows={2} value={edition.notes ?? ''} onChange={ev => setEdition({ ...edition, notes: ev.target.value })}
                          style={{ ...champ, width: '100%', marginTop: 4, resize: 'vertical' }} /></label>
            </div>
            <div className="flex justify-end gap-2" style={{ marginTop: 16 }}>
              <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none" onClick={() => setEdition(null)}>
                Annuler
              </StickerButton>
              <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
                const { data } = await e.enregistrerCommande(edition)
                setEdition(null)
                setOnglet('commandes')
                if (data && !edition.id) {
                  setCmdOuverte(data.id)
                  setQuantites({})
                  setGrilleFormat(formatsAplat[0]?.id ?? '')
                }
              }}>
                {edition.id ? 'Enregistrer' : 'Créer'}
              </StickerButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
