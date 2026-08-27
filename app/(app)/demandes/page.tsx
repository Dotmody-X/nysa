'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Package, Plus, Search, Trash2, Pencil, X, Clock, Upload, ExternalLink,
} from '@/components/ui/icons'
import { PageTitle, KpiGrid, KpiCard, SectionCard, StickerButton } from '@/components/ui/PageTitle'
import { useDemandes } from '@/hooks/useDemandes'
import { useClients } from '@/hooks/useClients'
import type { Demande, DemandeStatut, DemandeFichier, FichierCategorie } from '@/types'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ACCENT = 'var(--accent-demandes)'

const STATUTS: { value: DemandeStatut; label: string; couleur: string }[] = [
  { value: 'nouvelle',   label: 'Nouvelle',   couleur: 'var(--accent-todo)' },
  { value: 'en_cours',   label: 'En cours',   couleur: 'var(--accent-calendar)' },
  { value: 'en_attente', label: 'En attente', couleur: 'var(--bg-input)' },
  { value: 'livree',     label: 'Livrée',     couleur: 'var(--accent-sport)' },
  { value: 'facturee',   label: 'Facturée',   couleur: 'var(--accent-clients)' },
  { value: 'annulee',    label: 'Annulée',    couleur: 'var(--accent-recettes)' },
]

const CATEGORIES: { value: FichierCategorie; label: string }[] = [
  { value: 'visuel',  label: 'Visuel final' },
  { value: 'facture', label: 'Facture' },
  { value: 'brief',   label: 'Demande du client' },
  { value: 'autre',   label: 'Autre' },
]

const champ: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13, color: 'var(--text)',
  background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 8,
}

type Brouillon = Partial<Demande> & { titre: string }
const VIDE: Brouillon = { titre: '', statut: 'nouvelle' }

/** Heures et minutes — au-delà de quelques heures, les secondes n'apprennent rien. */
function duree(secondes: number): string {
  if (!secondes) return '—'
  const h = Math.floor(secondes / 3600)
  const m = Math.round((secondes % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

/**
 * Une pièce jointe. Le bucket étant privé, l'URL est signée à l'affichage et
 * expire au bout d'une heure : rien n'est atteignable sans être connecté.
 */
function Fichier({
  f, lien, onSupprimer,
}: {
  f: DemandeFichier
  lien: (f: DemandeFichier) => Promise<string | null>
  onSupprimer: (f: DemandeFichier) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const image = (f.file_type ?? '').startsWith('image/')

  useEffect(() => {
    let vivant = true
    lien(f).then(u => { if (vivant) setUrl(u) })
    return () => { vivant = false }
  }, [f.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ border: '2px solid var(--ink)', borderRadius: 8, overflow: 'hidden', width: image ? 130 : 'auto' }}>
      {image && url && (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={f.filename}
               style={{ display: 'block', width: '100%', height: 90, objectFit: 'cover' }} />
        </a>
      )}
      <div className="flex items-center justify-between gap-1" style={{ padding: '4px 6px', fontSize: 10 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.filename}>
          {f.filename}
        </span>
        <span className="flex gap-1" style={{ flexShrink: 0 }}>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" title="Ouvrir"
               style={{ padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
              <ExternalLink size={10} />
            </a>
          )}
          <button title="Supprimer" onClick={() => onSupprimer(f)}
                  style={{ padding: 2, border: '2px solid var(--ink)', borderRadius: 5, background: 'var(--bg-card)' }}>
            <Trash2 size={10} />
          </button>
        </span>
      </div>
    </div>
  )
}

/** Bouton de dépôt : un input fichier caché, déclenché par le bouton visible. */
function Depot({
  demandeId, categorie, label, onEnvoi,
}: {
  demandeId: string
  categorie: FichierCategorie
  label: string
  onEnvoi: (id: string, f: File, c: FichierCategorie) => Promise<{ error: unknown }>
}) {
  const input = useRef<HTMLInputElement>(null)
  const [enCours, setEnCours] = useState(false)
  const [souci, setSouci] = useState<string | null>(null)

  return (
    <>
      <input ref={input} type="file" hidden
             accept="image/png,image/jpeg,image/webp,image/gif,image/heic,application/pdf"
             onChange={async e => {
               const f = e.target.files?.[0]
               if (!f) return
               setEnCours(true); setSouci(null)
               const { error } = await onEnvoi(demandeId, f, categorie)
               if (error) setSouci(error instanceof Error ? error.message : String(error))
               setEnCours(false)
               e.target.value = ''
             }} />
      <button onClick={() => input.current?.click()} disabled={enCours}
              style={{ ...DF, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                       border: '2px solid var(--ink)', background: 'var(--bg-card)', color: 'var(--text)' }}>
        <Upload size={10} /> {enCours ? 'Envoi…' : label}
      </button>
      {souci && <span style={{ fontSize: 10, color: 'var(--accent-recettes)' }}>{souci}</span>}
    </>
  )
}

export default function DemandesPage() {
  const { dossiers, loading, create, update, remove, televerser, supprimerFichier, lien } = useDemandes()
  const { clients } = useClients()
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<DemandeStatut | 'tous'>('tous')
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [edition, setEdition] = useState<Brouillon | null>(null)
  const [enCours, setEnCours] = useState(false)

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return dossiers
      .map(d => ({
        ...d,
        demandes: d.demandes.filter(x => {
          if (filtre !== 'tous' && x.statut !== filtre) return false
          if (!q) return true
          return [x.titre, x.demande, x.numero_facture, x.notes, x.dossier_dropbox, d.nom, d.ville]
            .some(v => v?.toLowerCase().includes(q))
        }),
      }))
      .filter(d => d.demandes.length > 0)
  }, [dossiers, recherche, filtre])

  const totalDemandes = dossiers.reduce((s, d) => s + d.demandes.length, 0)
  const enChantier = dossiers.reduce(
    (s, d) => s + d.demandes.filter(x => x.statut === 'en_cours' || x.statut === 'nouvelle').length, 0)
  const totalSecondes = dossiers.reduce((s, d) => s + d.secondes, 0)

  async function enregistrer() {
    if (!edition?.titre.trim() || enCours) return
    setEnCours(true)
    const payload = { ...edition }
    if (edition.id) await update(edition.id, payload)
    else await create(payload as Brouillon)
    setEnCours(false)
    setEdition(null)
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Demandes"
        sub="Une fiche par client · visuels, factures et temps passé"
        accent={ACCENT}
        icon={Package}
        iconInk="var(--ink-light)"
      />

      <KpiGrid>
        <KpiCard label="Clients"     value={String(dossiers.length)} accent={ACCENT} />
        <KpiCard label="Demandes"    value={String(totalDemandes)} accent={ACCENT} />
        <KpiCard label="En chantier" value={String(enChantier)} sub="nouvelles + en cours" accent={ACCENT} />
        <KpiCard label="Temps suivi" value={duree(totalSecondes)} accent={ACCENT} />
      </KpiGrid>

      <SectionCard
        title="Par client"
        accent={ACCENT}
        action={
          <StickerButton accent={ACCENT} onClick={() => setEdition({ ...VIDE })}>
            <Plus size={13} /> Nouvelle demande
          </StickerButton>
        }
      >
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-2" style={{ ...champ, width: 'auto', flex: '1 1 220px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={recherche} onChange={e => setRecherche(e.target.value)}
                   placeholder="Client, demande, n° de facture…"
                   style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: 'var(--text)' }} />
          </div>
          <select value={filtre} onChange={e => setFiltre(e.target.value as DemandeStatut | 'tous')}
                  style={{ ...champ, width: 'auto' }}>
            <option value="tous">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</p>
        ) : visibles.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {totalDemandes === 0 ? 'Aucune demande enregistrée.' : 'Aucune demande ne correspond à cette recherche.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {visibles.map(d => {
              const cle = d.clientId ?? '__sans_client__'
              const déplié = ouvert === cle
              return (
                <div key={cle} style={{ border: '2px solid var(--ink)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                  <div className="flex items-center justify-between gap-3" style={{ padding: '10px 12px', cursor: 'pointer' }}
                       onClick={() => setOuvert(déplié ? null : cle)}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...DF, fontWeight: 800, fontSize: 13 }}>{d.nom}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {d.ville ?? (d.clientId ? 'ville inconnue' : 'travail interne ou magasin sans fiche')}
                        {' · '}{d.demandes.length} demande{d.demandes.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    {d.secondes > 0 && (
                      <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px',
                                     borderRadius: 999, whiteSpace: 'nowrap', border: '2px solid var(--ink)',
                                     background: ACCENT, color: 'var(--ink-dark)' }}>
                        <Clock size={11} /> {duree(d.secondes)}
                      </span>
                    )}
                  </div>

                  {déplié && (
                    <div style={{ borderTop: '2px solid var(--ink)', padding: 12, display: 'grid', gap: 10 }}>
                      {d.demandes.map(x => {
                        const st = STATUTS.find(s => s.value === x.statut) ?? STATUTS[0]
                        return (
                          <div key={x.id} style={{ display: 'grid', gap: 6, padding: 10, fontSize: 12,
                                                   border: '2px solid var(--ink)', borderRadius: 8 }}>
                            <div className="flex items-center justify-between gap-2">
                              <span style={{ ...DF, fontWeight: 800 }}>{x.titre}</span>
                              <span className="flex items-center gap-1">
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                                               border: '2px solid var(--ink)', background: st.couleur, color: 'var(--ink-dark)' }}>
                                  {st.label}
                                </span>
                                <button onClick={() => setEdition({ ...x })} title="Modifier"
                                        style={{ padding: 3, border: '2px solid var(--ink)', borderRadius: 6, background: 'var(--bg-card)' }}>
                                  <Pencil size={11} />
                                </button>
                                <button title="Supprimer"
                                        onClick={async () => { if (confirm(`Supprimer « ${x.titre} » ?`)) await remove(x.id) }}
                                        style={{ padding: 3, border: '2px solid var(--ink)', borderRadius: 6, background: 'var(--bg-card)' }}>
                                  <Trash2 size={11} />
                                </button>
                              </span>
                            </div>

                            {x.demande && <div>{x.demande}</div>}

                            <div style={{ color: 'var(--text-muted)' }}>
                              {x.date_demande ? `Demandée le ${x.date_demande}` : 'sans date'}
                              {x.date_livraison ? ` · livrée le ${x.date_livraison}` : ''}
                              {x.numero_facture ? ` · facture ${x.numero_facture}` : ''}
                              {x.montant != null ? ` · ${x.montant} €` : ''}
                            </div>

                            {(x.task || x.project) && (
                              <div style={{ color: 'var(--text-muted)' }}>
                                {x.task ? `Tâche : ${x.task.title}` : ''}
                                {x.task && x.project ? ' · ' : ''}
                                {x.project ? `Projet : ${x.project.name}` : ''}
                              </div>
                            )}

                            {x.dossier_dropbox && (
                              <div style={{ color: 'var(--text-muted)' }}>
                                <strong>Dropbox</strong> · <code>{x.dossier_dropbox}</code>
                              </div>
                            )}

                            {x.notes && <div style={{ color: 'var(--text-muted)' }}>{x.notes}</div>}

                            {!!x.fichiers?.length && (
                              <div className="flex flex-wrap gap-2" style={{ paddingTop: 4 }}>
                                {x.fichiers.map(f => (
                                  <Fichier key={f.id} f={f} lien={lien} onSupprimer={supprimerFichier} />
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2" style={{ paddingTop: 4 }}>
                              {CATEGORIES.filter(c => c.value !== 'autre').map(c => (
                                <Depot key={c.value} demandeId={x.id} categorie={c.value}
                                       label={c.label} onEnvoi={televerser} />
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {edition && (
        <div onClick={() => setEdition(null)}
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()}
               style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)',
                        boxShadow: '6px 6px 0 var(--ink)', padding: 20, width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <p style={{ ...DF, fontWeight: 800, fontSize: 15 }}>
                {edition.id ? 'Modifier la demande' : 'Nouvelle demande'}
              </p>
              <button onClick={() => setEdition(null)}
                      style={{ padding: 5, border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--bg-card)' }}>
                <X size={13} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Titre *
                <input autoFocus value={edition.titre}
                       onChange={e => setEdition({ ...edition, titre: e.target.value })}
                       style={{ ...champ, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Client
                <select value={edition.client_id ?? ''}
                        onChange={e => setEdition({ ...edition, client_id: e.target.value || undefined })}
                        style={{ ...champ, marginTop: 4 }}>
                  <option value="">— aucun —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.ville ? ` · ${c.ville}` : ''}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                La demande du client
                <textarea rows={3} value={edition.demande ?? ''}
                          onChange={e => setEdition({ ...edition, demande: e.target.value })}
                          style={{ ...champ, marginTop: 4, resize: 'vertical' }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Statut
                  <select value={edition.statut ?? 'nouvelle'}
                          onChange={e => setEdition({ ...edition, statut: e.target.value as DemandeStatut })}
                          style={{ ...champ, marginTop: 4 }}>
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  N° de facture
                  <input value={edition.numero_facture ?? ''}
                         onChange={e => setEdition({ ...edition, numero_facture: e.target.value })}
                         style={{ ...champ, marginTop: 4 }} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Demandée le
                  <input type="date" value={edition.date_demande ?? ''}
                         onChange={e => setEdition({ ...edition, date_demande: e.target.value || undefined })}
                         style={{ ...champ, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Livrée le
                  <input type="date" value={edition.date_livraison ?? ''}
                         onChange={e => setEdition({ ...edition, date_livraison: e.target.value || undefined })}
                         style={{ ...champ, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Montant €
                  <input type="number" step="0.01" value={edition.montant ?? ''}
                         onChange={e => setEdition({ ...edition, montant: e.target.value ? Number(e.target.value) : undefined })}
                         style={{ ...champ, marginTop: 4 }} />
                </label>
              </div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Dossier Dropbox
                <input value={edition.dossier_dropbox ?? ''}
                       onChange={e => setEdition({ ...edition, dossier_dropbox: e.target.value })}
                       placeholder="07_Client/Shop/…"
                       style={{ ...champ, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Notes
                <textarea rows={2} value={edition.notes ?? ''}
                          onChange={e => setEdition({ ...edition, notes: e.target.value })}
                          style={{ ...champ, marginTop: 4, resize: 'vertical' }} />
              </label>
            </div>

            <div className="flex justify-end gap-2" style={{ marginTop: 16 }}>
              <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none" onClick={() => setEdition(null)}>
                Annuler
              </StickerButton>
              <StickerButton accent={ACCENT} tilt="none" onClick={enregistrer}>
                {enCours ? 'Enregistrement…' : edition.id ? 'Enregistrer' : 'Créer'}
              </StickerButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
