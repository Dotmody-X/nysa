'use client'
import { useState, useMemo } from 'react'
import { Printer, Plus, Search, Trash2, Pencil, X, Eye, EyeOff, Copy, Check } from '@/components/ui/icons'
import { PageTitle, KpiGrid, KpiCard, SectionCard, StickerButton } from '@/components/ui/PageTitle'
import { useImprimantes, useClientAcces } from '@/hooks/useImprimantes'
import { useClients } from '@/hooks/useClients'
import type { Imprimante, ImprimanteStatut, ClientAcces } from '@/types'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ACCENT = 'var(--accent-imprim)'

const STATUTS: { value: ImprimanteStatut; label: string; couleur: string }[] = [
  { value: 'demandee',     label: 'Demandée',     couleur: 'var(--bg-input)' },
  { value: 'commandee',    label: 'Commandée',    couleur: 'var(--accent-todo)' },
  { value: 'envoyee',      label: 'Envoyée',      couleur: 'var(--accent-calendar)' },
  { value: 'en_service',   label: 'En service',   couleur: 'var(--accent-sport)' },
  { value: 'retournee',    label: 'Retournée',    couleur: 'var(--bg-input)' },
  { value: 'hors_service', label: 'Hors service', couleur: 'var(--accent-recettes)' },
]

const champ: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13, color: 'var(--text)',
  background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 8,
}

type Brouillon = Partial<Imprimante> & { magasin: string }
const VIDE: Brouillon = { magasin: '', modele: 'Brother QL-800', statut: 'en_service', nombre: 1, document_signe: false }

/** Champ sensible : masqué par défaut, révélé à la demande, copiable. */
function Secret({ valeur }: { valeur?: string }) {
  const [visible, setVisible] = useState(false)
  const [copie, setCopie] = useState(false)
  if (!valeur) return <span style={{ color: 'var(--text-muted)' }}>—</span>

  return (
    <span className="inline-flex items-center gap-2">
      <code style={{ fontSize: 12, letterSpacing: visible ? 0 : 2 }}>
        {visible ? valeur : '•'.repeat(Math.min(valeur.length, 10))}
      </code>
      <button onClick={() => setVisible(v => !v)} title={visible ? 'Masquer' : 'Afficher'}
              style={{ padding: 3, border: '2px solid var(--ink)', borderRadius: 6, background: 'var(--bg-card)' }}>
        {visible ? <EyeOff size={11} /> : <Eye size={11} />}
      </button>
      <button
        title="Copier"
        onClick={async () => {
          await navigator.clipboard.writeText(valeur)
          setCopie(true)
          setTimeout(() => setCopie(false), 1200)
        }}
        style={{ padding: 3, border: '2px solid var(--ink)', borderRadius: 6, background: 'var(--bg-card)' }}
      >
        {copie ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  )
}

/** Un compte parmi ceux du client : lecture, edition, suppression. */
function LigneAcces({
  a, onSave, onRemove,
}: {
  a: ClientAcces
  onSave: (p: Partial<ClientAcces> & { id?: string }) => Promise<unknown>
  onRemove: (id: string) => Promise<unknown>
}) {
  const [edite, setEdite] = useState(false)
  const [form, setForm] = useState({
    service: a.service, identifiant: a.identifiant ?? '', motdepasse: a.motdepasse ?? '', notes: a.notes ?? '',
  })

  if (edite) {
    return (
      <div style={{ display: 'grid', gap: 6, padding: 8, border: '2px solid var(--ink)', borderRadius: 8 }}>
        <input placeholder="Service" value={form.service}
               onChange={e => setForm({ ...form, service: e.target.value })} style={champ} />
        <input placeholder="Identifiant / e-mail" value={form.identifiant}
               onChange={e => setForm({ ...form, identifiant: e.target.value })} style={champ} />
        <input placeholder="Mot de passe" value={form.motdepasse}
               onChange={e => setForm({ ...form, motdepasse: e.target.value })} style={champ} />
        <input placeholder="Note — quel site, quelle personne…" value={form.notes}
               onChange={e => setForm({ ...form, notes: e.target.value })} style={champ} />
        <div className="flex gap-2">
          <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none" onClick={() => setEdite(false)}>
            Annuler
          </StickerButton>
          <StickerButton accent={ACCENT} tilt="none"
                         onClick={async () => { await onSave({ ...form, id: a.id }); setEdite(false) }}>
            Enregistrer
          </StickerButton>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 4, padding: 8, border: '2px solid var(--ink)', borderRadius: 8 }}>
      <div className="flex items-center justify-between gap-2">
        <span style={{ ...DF, fontWeight: 800, fontSize: 11 }}>{a.service}</span>
        <span className="flex gap-1">
          <button onClick={() => setEdite(true)} title="Modifier"
                  style={{ padding: 3, border: '2px solid var(--ink)', borderRadius: 6, background: 'var(--bg-card)' }}>
            <Pencil size={11} />
          </button>
          <button onClick={() => onRemove(a.id)} title="Supprimer"
                  style={{ padding: 3, border: '2px solid var(--ink)', borderRadius: 6, background: 'var(--bg-card)' }}>
            <Trash2 size={11} />
          </button>
        </span>
      </div>
      {a.notes && <div style={{ color: 'var(--text-muted)' }}>{a.notes}</div>}
      <div><strong>Identifiant</strong> · {a.identifiant || <span style={{ color: 'var(--text-muted)' }}>—</span>}</div>
      <div><strong>Mot de passe</strong> · <Secret valeur={a.motdepasse} /></div>
      <div style={{ color: 'var(--text-muted)' }}>
        Identifiants envoyés : {a.mail_identifiants_envoye ? 'oui' : 'non'} ·
        Mise à disposition : {a.mail_mise_a_dispo_envoye ? 'oui' : 'non'} ·
        Installation : {a.mail_installation_envoye ? 'oui' : 'non'}
      </div>
      {a.date_creation && (
        <div style={{ color: 'var(--text-muted)' }}>Ouvert le {a.date_creation}</div>
      )}
    </div>
  )
}

/** Accès du client au site d’étiquettes, chargés seulement quand la fiche est ouverte. */
function AccesClient({ clientId }: { clientId: string }) {
  const { acces, loading, save, remove } = useClientAcces(clientId)
  const [ajout, setAjout] = useState(false)
  const [form, setForm] = useState({ service: 'mixo-label', identifiant: '', motdepasse: '', notes: '' })

  if (loading) return <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</p>

  return (
    <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
      {acces.length === 0 && !ajout && (
        <p style={{ color: 'var(--text-muted)' }}>Aucun accès enregistré pour ce client.</p>
      )}

      {acces.map(a => (
        <LigneAcces key={a.id} a={a} onSave={save} onRemove={remove} />
      ))}

      {ajout ? (
        <div style={{ display: 'grid', gap: 6, padding: 8, border: '2px solid var(--ink)', borderRadius: 8 }}>
          <input placeholder="Service" value={form.service}
                 onChange={e => setForm({ ...form, service: e.target.value })} style={champ} />
          <input placeholder="Identifiant / e-mail" value={form.identifiant}
                 onChange={e => setForm({ ...form, identifiant: e.target.value })} style={champ} />
          <input placeholder="Mot de passe" value={form.motdepasse}
                 onChange={e => setForm({ ...form, motdepasse: e.target.value })} style={champ} />
          <input placeholder="Note — quel site, quelle personne…" value={form.notes}
                 onChange={e => setForm({ ...form, notes: e.target.value })} style={champ} />
          <div className="flex gap-2">
            <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none" onClick={() => setAjout(false)}>
              Annuler
            </StickerButton>
            <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
              await save(form)
              setForm({ service: 'mixo-label', identifiant: '', motdepasse: '', notes: '' })
              setAjout(false)
            }}>
              Enregistrer
            </StickerButton>
          </div>
        </div>
      ) : (
        <button onClick={() => setAjout(true)}
                style={{ ...DF, fontSize: 11, fontWeight: 700, color: ACCENT, textAlign: 'left' }}>
          Ajouter un accès
        </button>
      )}
    </div>
  )
}

export default function ImprimantesPage() {
  const { imprimantes, loading, create, update, remove } = useImprimantes()
  const { clients } = useClients()
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<ImprimanteStatut | 'tous'>('tous')
  const [edition, setEdition] = useState<Brouillon | null>(null)
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return imprimantes.filter(i => {
      if (filtre !== 'tous' && i.statut !== filtre) return false
      if (!q) return true
      return [i.magasin, i.serial, i.adresse, i.client?.name].some(v => v?.toLowerCase().includes(q))
    })
  }, [imprimantes, recherche, filtre])

  const enService = imprimantes.filter(i => i.statut === 'en_service').length
  const total = imprimantes.reduce((s, i) => s + (i.nombre ?? 1), 0)
  const orphelines = imprimantes.filter(i => !i.client_id).length

  async function enregistrer() {
    if (!edition?.magasin.trim() || enCours) return
    setEnCours(true)
    if (edition.id) await update(edition.id, edition)
    else await create(edition)
    setEnCours(false)
    setEdition(null)
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Imprimantes"
        sub="Parc mis à disposition des magasins · étiquettes DGCCRF"
        accent={ACCENT}
        icon={Printer}
        iconInk="var(--ink-light)"
      />

      <KpiGrid>
        <KpiCard label="Machines"     value={String(total)} sub={`${imprimantes.length} lignes`} accent={ACCENT} />
        <KpiCard label="En service"   value={String(enService)} accent={ACCENT} />
        <KpiCard label="Sans client"  value={String(orphelines)} sub="à rattacher" accent={ACCENT} />
        <KpiCard label="Affichées"    value={String(visibles.length)} accent={ACCENT} />
      </KpiGrid>

      <SectionCard
        title="Parc"
        accent={ACCENT}
        action={
          <StickerButton accent={ACCENT} onClick={() => setEdition({ ...VIDE })}>
            <Plus size={13} /> Ajouter
          </StickerButton>
        }
      >
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-2" style={{ ...champ, width: 'auto', flex: '1 1 220px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input value={recherche} onChange={e => setRecherche(e.target.value)}
                   placeholder="Magasin, n° de série, adresse…"
                   style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: 'var(--text)' }} />
          </div>
          <select value={filtre} onChange={e => setFiltre(e.target.value as ImprimanteStatut | 'tous')}
                  style={{ ...champ, width: 'auto' }}>
            <option value="tous">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</p>
        ) : visibles.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {imprimantes.length === 0
              ? "Aucune imprimante enregistrée. Ajoute la première, ou importe la liste existante."
              : 'Aucune imprimante ne correspond à cette recherche.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {visibles.map(i => {
              const st = STATUTS.find(s => s.value === i.statut) ?? STATUTS[3]
              const dépliée = ouverte === i.id
              return (
                <div key={i.id} style={{ border: '2px solid var(--ink)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                  <div className="flex items-center justify-between gap-3" style={{ padding: '10px 12px', cursor: 'pointer' }}
                       onClick={() => setOuverte(dépliée ? null : i.id)}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...DF, fontWeight: 800, fontSize: 13 }}>
                        {i.magasin}
                        {i.nombre > 1 && <span style={{ color: 'var(--text-muted)' }}> ×{i.nombre}</span>}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {i.serial ? <code>{i.serial}</code> : 'sans n° de série'}
                        {i.client?.name ? ` · ${i.client.name}` : ' · non rattachée'}
                        {i.adresse ? ` · ${i.adresse}` : ''}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                                   border: '2px solid var(--ink)', background: st.couleur, color: 'var(--ink-dark)' }}>
                      {st.label}
                    </span>
                  </div>

                  {dépliée && (
                    <div style={{ borderTop: '2px solid var(--ink)', padding: 12, display: 'grid', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, fontSize: 12 }}>
                        <div><strong>Modèle</strong><br />{i.modele}</div>
                        <div><strong>N° de série</strong><br />{i.serial ? <code>{i.serial}</code> : '—'}</div>
                        <div><strong>Mise à disposition</strong><br />{i.date_mise_a_dispo ?? '—'}</div>
                        <div><strong>Document signé</strong><br />{i.document_signe ? 'oui' : 'non'}</div>
                      </div>
                      {i.adresse && <div style={{ fontSize: 12 }}><strong>Adresse</strong><br />{i.adresse}</div>}
                      {i.notes && <div style={{ fontSize: 12 }}><strong>Notes</strong><br />{i.notes}</div>}

                      <div style={{ borderTop: '1px dashed var(--ink)', paddingTop: 10 }}>
                        <p style={{ ...DF, fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Accès au site d’étiquettes</p>
                        {i.client_id
                          ? <AccesClient clientId={i.client_id} />
                          : <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Rattache d’abord cette imprimante à un client : les accès appartiennent au magasin, pas à la machine.
                            </p>}
                      </div>

                      <div className="flex gap-2">
                        <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none" onClick={() => setEdition({ ...i })}>
                          <Pencil size={12} /> Modifier
                        </StickerButton>
                        <StickerButton accent="var(--bg-input)" ink="var(--text)" tilt="none"
                                       onClick={async () => { if (confirm(`Supprimer l’imprimante de « ${i.magasin} » ?`)) await remove(i.id) }}>
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

      {edition && (
        <div onClick={() => setEdition(null)}
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()}
               style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)',
                        boxShadow: '6px 6px 0 var(--ink)', padding: 20, width: 'min(520px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <p style={{ ...DF, fontWeight: 800, fontSize: 15 }}>
                {edition.id ? 'Modifier l’imprimante' : 'Nouvelle imprimante'}
              </p>
              <button onClick={() => setEdition(null)} style={{ padding: 5, border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--bg-card)' }}>
                <X size={13} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Magasin *
                <input autoFocus value={edition.magasin} onChange={e => setEdition({ ...edition, magasin: e.target.value })} style={{ ...champ, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Client rattaché
                <select value={edition.client_id ?? ''} onChange={e => setEdition({ ...edition, client_id: e.target.value || undefined })} style={{ ...champ, marginTop: 4 }}>
                  <option value="">— aucun —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.ville ? ` · ${c.ville}` : ''}</option>)}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Modèle
                  <input value={edition.modele ?? ''} onChange={e => setEdition({ ...edition, modele: e.target.value })} style={{ ...champ, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  N° de série
                  <input value={edition.serial ?? ''} onChange={e => setEdition({ ...edition, serial: e.target.value })} style={{ ...champ, marginTop: 4 }} />
                </label>
              </div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Adresse de livraison
                <input value={edition.adresse ?? ''} onChange={e => setEdition({ ...edition, adresse: e.target.value })} style={{ ...champ, marginTop: 4 }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Mise à dispo
                  <input type="date" value={edition.date_mise_a_dispo ?? ''} onChange={e => setEdition({ ...edition, date_mise_a_dispo: e.target.value })} style={{ ...champ, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Statut
                  <select value={edition.statut ?? 'en_service'} onChange={e => setEdition({ ...edition, statut: e.target.value as ImprimanteStatut })} style={{ ...champ, marginTop: 4 }}>
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Nombre
                  <input type="number" min={1} value={edition.nombre ?? 1} onChange={e => setEdition({ ...edition, nombre: Number(e.target.value) })} style={{ ...champ, marginTop: 4 }} />
                </label>
              </div>
              <label className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: 700 }}>
                <input type="checkbox" checked={edition.document_signe ?? false} onChange={e => setEdition({ ...edition, document_signe: e.target.checked })} />
                Document de mise à disposition signé
              </label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Notes
                <textarea rows={3} value={edition.notes ?? ''} onChange={e => setEdition({ ...edition, notes: e.target.value })} style={{ ...champ, marginTop: 4, resize: 'vertical' }} />
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
