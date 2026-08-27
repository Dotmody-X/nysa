'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Barcode, Plus, Search, Trash2, Pencil, X, AlertTriangle, Check, Upload, ExternalLink,
} from '@/components/ui/icons'
import { PageTitle, KpiGrid, KpiCard, SectionCard, StickerButton } from '@/components/ui/PageTitle'
import { useEtiquettes } from '@/hooks/useEtiquettes'
import type {
  EtatFichier, EtiquetteCommande, CommandeEtiquetteStatut,
  EtiquetteFichier, EtiquetteFichierCategorie,
} from '@/types'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ACCENT = 'var(--accent-etiquettes)'

const ETATS: Record<EtatFichier, { label: string; couleur: string; alerte: boolean }> = {
  a_jour:            { label: 'À jour',            couleur: 'var(--accent-sport)',    alerte: false },
  modifie:           { label: 'Fichier à envoyer', couleur: 'var(--accent-recettes)', alerte: true  },
  changement_envoye: { label: 'Changement envoyé', couleur: 'var(--accent-calendar)', alerte: false },
}

const STATUTS: { value: CommandeEtiquetteStatut; label: string; couleur: string }[] = [
  { value: 'brouillon',     label: 'Brouillon',     couleur: 'var(--bg-input)' },
  { value: 'confirmee',     label: 'Confirmée',     couleur: 'var(--accent-calendar)' },
  { value: 'en_production', label: 'En production', couleur: 'var(--accent-todo)' },
  { value: 'recue',         label: 'Reçue',         couleur: 'var(--accent-sport)' },
  { value: 'annulee',       label: 'Annulée',       couleur: 'var(--accent-recettes)' },
]

const champ: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13, color: 'var(--text)',
  background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 8,
}
const petit: React.CSSProperties = { ...champ, padding: '5px 7px', fontSize: 12 }

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
      <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
             onChange={async e => {
               const f = e.target.files?.[0]
               if (!f) return
               setEnCours(true)
               await onEnvoi(commandeId, f, categorie)
               setEnCours(false)
               e.target.value = ''
             }} />
      <button onClick={() => input.current?.click()} disabled={enCours}
              style={{ ...DF, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                       border: '2px solid var(--ink)', background: 'var(--bg-card)', color: 'var(--text)' }}>
        <Upload size={10} /> {enCours ? 'Envoi…' : label}
      </button>
    </>
  )
}

export default function EtiquettesPage() {
  const e = useEtiquettes()
  const [onglet, setOnglet] = useState<'formats' | 'commandes'>('formats')
  const [recherche, setRecherche] = useState('')
  const [gammeOuverte, setGammeOuverte] = useState<string | null>(null)
  const [formatOuvert, setFormatOuvert] = useState<string | null>(null)
  const [cmdOuverte, setCmdOuverte] = useState<string | null>(null)
  const [edition, setEdition] = useState<Partial<EtiquetteCommande> | null>(null)
  const [ajoutLigne, setAjoutLigne] = useState<{ etiquetteId: string; quantite: string }>({ etiquetteId: '', quantite: '' })
  const [nouvelleSaveur, setNouvelleSaveur] = useState('')

  const toutes = useMemo(
    () => e.gammes.flatMap(g => g.formats.flatMap(f =>
      f.etiquettes.map(x => ({ ...x, gamme: g.nom, format: f })))),
    [e.gammes])

  const aRenvoyer = toutes.filter(x => x.etat_fichier === 'modifie')
  const nbFormats = e.gammes.reduce((s, g) => s + g.formats.length, 0)

  const q = recherche.trim().toLowerCase()
  const gammesVues = useMemo(() => {
    if (!q) return e.gammes
    return e.gammes
      .map(g => ({
        ...g,
        formats: g.formats
          .map(f => ({ ...f, etiquettes: f.etiquettes.filter(x => x.saveur.toLowerCase().includes(q)) }))
          .filter(f => f.etiquettes.length > 0
            || `${f.contenance} ${f.variante ?? ''} ${f.dimensions ?? ''}`.toLowerCase().includes(q)),
      }))
      .filter(g => g.formats.length > 0 || g.nom.toLowerCase().includes(q))
  }, [e.gammes, q])

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Étiquettes"
        sub="Formats par gamme · commandes · BAT et factures"
        accent={ACCENT}
        icon={Barcode}
        iconInk="var(--ink-light)"
      />

      <KpiGrid>
        <KpiCard label="Gammes"     value={String(e.gammes.length)} accent={ACCENT} />
        <KpiCard label="Formats"    value={String(nbFormats)} accent={ACCENT} />
        <KpiCard label="Étiquettes" value={String(toutes.length)} accent={ACCENT} />
        <KpiCard label="À renvoyer" value={String(aRenvoyer.length)}
                 sub="fichier modifié" accent={aRenvoyer.length ? 'var(--accent-recettes)' : ACCENT} />
      </KpiGrid>

      {aRenvoyer.length > 0 && (
        <div style={{ display: 'grid', gap: 6, padding: 12, border: '2px solid var(--ink)',
                      borderRadius: 'var(--radius-md)', background: 'var(--accent-recettes)',
                      color: 'var(--ink-dark)', boxShadow: '4px 4px 0 var(--ink)' }}>
          <p className="flex items-center gap-2" style={{ ...DF, fontWeight: 800, fontSize: 13 }}>
            <AlertTriangle size={14} />
            {aRenvoyer.length} fichier{aRenvoyer.length > 1 ? 's' : ''} à envoyer à l’imprimeur
          </p>
          <p style={{ fontSize: 12 }}>
            Ces visuels ont changé depuis la dernière commande : l’imprimeur détient une version périmée.
            À la confirmation d’une commande qui les contient, ils passeront seuls en « changement envoyé ».
          </p>
          <p style={{ fontSize: 12 }}>
            {aRenvoyer.slice(0, 12).map(x => `${x.saveur} (${x.gamme} ${x.format.contenance})`).join(' · ')}
            {aRenvoyer.length > 12 && ` … et ${aRenvoyer.length - 12} autres`}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        {(['formats', 'commandes'] as const).map(o => (
          <StickerButton key={o} tilt="none"
                         accent={onglet === o ? ACCENT : 'var(--bg-input)'}
                         ink={onglet === o ? undefined : 'var(--text)'}
                         onClick={() => setOnglet(o)}>
            {o === 'formats' ? 'Gammes et formats' : `Commandes (${e.commandes.length})`}
          </StickerButton>
        ))}
      </div>

      {onglet === 'formats' && (
        <SectionCard title="Gammes et formats" accent={ACCENT}>
          <div className="flex items-center gap-2" style={{ ...champ, marginBottom: 12 }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={recherche} onChange={ev => setRecherche(ev.target.value)}
                   placeholder="Gamme, format, dimensions, saveur…"
                   style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: 'var(--text)' }} />
          </div>

          {e.loading ? <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</p> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {gammesVues.map(g => (
                <div key={g.id} style={{ border: '2px solid var(--ink)', borderRadius: 'var(--radius-md)',
                                         background: 'var(--bg-card)', overflow: 'hidden' }}>
                  <div className="flex items-center justify-between gap-3" style={{ padding: '10px 12px', cursor: 'pointer' }}
                       onClick={() => setGammeOuverte(gammeOuverte === g.id ? null : g.id)}>
                    <div>
                      <p style={{ ...DF, fontWeight: 800, fontSize: 13 }}>{g.nom}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {g.formats.length} format{g.formats.length > 1 ? 's' : ''}
                        {' · '}
                        {g.formats.reduce((s, f) => s + f.etiquettes.length, 0)} étiquettes
                      </p>
                    </div>
                  </div>

                  {gammeOuverte === g.id && (
                    <div style={{ borderTop: '2px solid var(--ink)', padding: 12, display: 'grid', gap: 8 }}>
                      {g.formats.length === 0 && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Aucun format renseigné pour cette gamme.
                        </p>
                      )}
                      {g.formats.map(f => (
                        <div key={f.id} style={{ border: '2px solid var(--ink)', borderRadius: 8, overflow: 'hidden' }}>
                          <div className="flex items-center justify-between gap-2"
                               style={{ padding: '8px 10px', cursor: 'pointer' }}
                               onClick={() => setFormatOuvert(formatOuvert === f.id ? null : f.id)}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ ...DF, fontWeight: 800, fontSize: 12 }}>
                                {f.contenance}{f.variante ? ` · ${f.variante}` : ''}
                                {f.dimensions && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — {f.dimensions}</span>}
                              </p>
                              {f.specification && (
                                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{f.specification}</p>
                              )}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {f.etiquettes.length} saveurs
                            </span>
                          </div>

                          {formatOuvert === f.id && (
                            <div style={{ borderTop: '2px solid var(--ink)', padding: 10, display: 'grid', gap: 4 }}>
                              {f.etiquettes.map(x => {
                                const et = ETATS[x.etat_fichier]
                                return (
                                  <div key={x.id} className="flex items-center justify-between gap-2"
                                       style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                                    <span>{x.saveur}</span>
                                    <span className="flex items-center gap-2">
                                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                        {x.derniere_commande ? `commandée ${x.derniere_commande}` : 'jamais commandée'}
                                      </span>
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                                                     border: '2px solid var(--ink)', background: et.couleur, color: 'var(--ink-dark)' }}>
                                        {et.label}
                                      </span>
                                      {x.etat_fichier === 'modifie' ? (
                                        <button title="Annuler le signalement" onClick={() => e.marquerEtat(x.id, 'a_jour')}
                                                style={{ padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                                          <Check size={10} />
                                        </button>
                                      ) : (
                                        <button title="Signaler un changement de visuel" onClick={() => e.marquerEtat(x.id, 'modifie')}
                                                style={{ padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                                          <AlertTriangle size={10} />
                                        </button>
                                      )}
                                      <button title="Supprimer" onClick={async () => {
                                        if (confirm(`Supprimer l’étiquette « ${x.saveur} » ?`)) await e.supprimerEtiquette(x.id)
                                      }} style={{ padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                                        <Trash2 size={10} />
                                      </button>
                                    </span>
                                  </div>
                                )
                              })}
                              <div className="flex gap-2" style={{ marginTop: 6 }}>
                                <input value={nouvelleSaveur} onChange={ev => setNouvelleSaveur(ev.target.value)}
                                       placeholder="Ajouter une saveur…" style={petit} />
                                <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
                                  if (!nouvelleSaveur.trim()) return
                                  await e.ajouterEtiquette(f.id, nouvelleSaveur.trim())
                                  setNouvelleSaveur('')
                                }}>
                                  <Plus size={12} />
                                </StickerButton>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {onglet === 'commandes' && (
        <SectionCard
          title="Commandes"
          accent={ACCENT}
          action={
            <StickerButton accent={ACCENT} onClick={() => setEdition({ statut: 'brouillon', date_commande: new Date().toISOString().slice(0, 10) })}>
              <Plus size={13} /> Nouvelle commande
            </StickerButton>
          }
        >
          {e.commandes.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucune commande enregistrée.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {e.commandes.map(c => {
                const st = STATUTS.find(s => s.value === c.statut) ?? STATUTS[0]
                const alerte = (c.lignes ?? []).filter(l => l.etiquette?.etat_fichier === 'modifie')
                const total = (c.lignes ?? []).reduce((s, l) => s + l.quantite, 0)
                return (
                  <div key={c.id} style={{ border: '2px solid var(--ink)', borderRadius: 'var(--radius-md)',
                                           background: 'var(--bg-card)', overflow: 'hidden' }}>
                    <div className="flex items-center justify-between gap-3" style={{ padding: '10px 12px', cursor: 'pointer' }}
                         onClick={() => setCmdOuverte(cmdOuverte === c.id ? null : c.id)}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ ...DF, fontWeight: 800, fontSize: 13 }}>
                          {c.reference || 'Sans référence'}
                          {c.imprimeur && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {c.imprimeur}</span>}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {c.date_commande ?? 'sans date'} · {(c.lignes ?? []).length} lignes · {total} étiquettes
                          {c.numero_facture ? ` · facture ${c.numero_facture}` : ''}
                        </p>
                      </div>
                      <span className="flex items-center gap-2">
                        {alerte.length > 0 && (
                          <span className="flex items-center gap-1" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px',
                                         borderRadius: 999, border: '2px solid var(--ink)',
                                         background: 'var(--accent-recettes)', color: 'var(--ink-dark)' }}>
                            <AlertTriangle size={10} /> {alerte.length} fichier{alerte.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                                       border: '2px solid var(--ink)', background: st.couleur, color: 'var(--ink-dark)' }}>
                          {st.label}
                        </span>
                      </span>
                    </div>

                    {cmdOuverte === c.id && (
                      <div style={{ borderTop: '2px solid var(--ink)', padding: 12, display: 'grid', gap: 10 }}>
                        {alerte.length > 0 && c.statut === 'brouillon' && (
                          <p style={{ fontSize: 12, padding: 8, border: '2px solid var(--ink)', borderRadius: 8,
                                      background: 'var(--accent-recettes)', color: 'var(--ink-dark)' }}>
                            <strong>Envoyer les fichiers</strong> — {alerte.map(l => l.etiquette?.saveur).join(', ')}.
                            À la confirmation, ces étiquettes passeront en « changement envoyé ».
                          </p>
                        )}

                        <div style={{ display: 'grid', gap: 3 }}>
                          {(c.lignes ?? []).map(l => (
                            <div key={l.id} className="flex items-center justify-between gap-2"
                                 style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                              <span>
                                {l.etiquette?.saveur ?? '—'}
                                {l.fichier_envoye && (
                                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}> · fichier envoyé</span>
                                )}
                                {!l.fichier_envoye && l.etiquette?.etat_fichier === 'modifie' && (
                                  <span style={{ fontSize: 10, color: 'var(--accent-recettes)', fontWeight: 700 }}> · fichier à envoyer</span>
                                )}
                              </span>
                              <span className="flex items-center gap-2">
                                <strong>{l.quantite}</strong>
                                <button title="Retirer" onClick={() => e.retirerLigne(l.id)}
                                        style={{ padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
                                  <Trash2 size={10} />
                                </button>
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <select value={ajoutLigne.etiquetteId}
                                  onChange={ev => setAjoutLigne({ ...ajoutLigne, etiquetteId: ev.target.value })}
                                  style={{ ...petit, flex: '1 1 240px' }}>
                            <option value="">— choisir une étiquette —</option>
                            {toutes.map(x => (
                              <option key={x.id} value={x.id}>
                                {x.gamme} · {x.format.contenance}{x.format.variante ? ` ${x.format.variante}` : ''} · {x.saveur}
                                {x.etat_fichier === 'modifie' ? '  ⚠ fichier à envoyer' : ''}
                              </option>
                            ))}
                          </select>
                          <input type="number" min={1} value={ajoutLigne.quantite} placeholder="Qté"
                                 onChange={ev => setAjoutLigne({ ...ajoutLigne, quantite: ev.target.value })}
                                 style={{ ...petit, width: 90 }} />
                          <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
                            const n = Number(ajoutLigne.quantite)
                            if (!ajoutLigne.etiquetteId || !n) return
                            await e.ajouterLigne(c.id, ajoutLigne.etiquetteId, n)
                            setAjoutLigne({ etiquetteId: '', quantite: '' })
                          }}>
                            <Plus size={12} /> Ajouter
                          </StickerButton>
                        </div>

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
                            if (confirm(`Supprimer la commande « ${c.reference || 'sans référence'} » ?`)) await e.supprimerCommande(c.id)
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
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Référence
                  <input value={edition.reference ?? ''} onChange={ev => setEdition({ ...edition, reference: ev.target.value })}
                         style={{ ...champ, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Imprimeur
                  <input value={edition.imprimeur ?? ''} onChange={ev => setEdition({ ...edition, imprimeur: ev.target.value })}
                         style={{ ...champ, marginTop: 4 }} />
                </label>
              </div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Statut
                <select value={edition.statut ?? 'brouillon'}
                        onChange={ev => setEdition({ ...edition, statut: ev.target.value as CommandeEtiquetteStatut })}
                        style={{ ...champ, marginTop: 4 }}>
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>
                  Passer en « Confirmée » bascule les étiquettes modifiées en « changement envoyé ».
                </span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Commandée le
                  <input type="date" value={edition.date_commande ?? ''}
                         onChange={ev => setEdition({ ...edition, date_commande: ev.target.value || undefined })}
                         style={{ ...champ, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Reçue le
                  <input type="date" value={edition.date_reception ?? ''}
                         onChange={ev => setEdition({ ...edition, date_reception: ev.target.value || undefined })}
                         style={{ ...champ, marginTop: 4 }} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  N° de facture
                  <input value={edition.numero_facture ?? ''} onChange={ev => setEdition({ ...edition, numero_facture: ev.target.value })}
                         style={{ ...champ, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Montant €
                  <input type="number" step="0.01" value={edition.montant ?? ''}
                         onChange={ev => setEdition({ ...edition, montant: ev.target.value ? Number(ev.target.value) : undefined })}
                         style={{ ...champ, marginTop: 4 }} />
                </label>
              </div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Notes
                <textarea rows={2} value={edition.notes ?? ''} onChange={ev => setEdition({ ...edition, notes: ev.target.value })}
                          style={{ ...champ, marginTop: 4, resize: 'vertical' }} />
              </label>
            </div>

            <div className="flex justify-end gap-2" style={{ marginTop: 16 }}>
              <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none" onClick={() => setEdition(null)}>
                Annuler
              </StickerButton>
              <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
                await e.enregistrerCommande(edition)
                setEdition(null)
                setOnglet('commandes')
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
