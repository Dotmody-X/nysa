'use client'
import { useState, useMemo } from 'react'
import { Printer, Plus, Search, Trash2, Pencil, X, Eye, EyeOff, Copy, Check } from '@/components/ui/icons'
import { PageTitle, KpiGrid, KpiCard, SectionCard, StickerButton } from '@/components/ui/PageTitle'
import { useImprimantes, useClientAcces, useMagasins } from '@/hooks/useImprimantes'
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
  const { loading: chargeParc, create, update, remove } = useImprimantes()
  const { magasins, loading: chargeMagasins, refetch } = useMagasins()
  const { clients } = useClients()
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<ImprimanteStatut | 'tous'>('tous')
  const [edition, setEdition] = useState<Brouillon | null>(null)
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const loading = chargeParc || chargeMagasins

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return magasins.filter(m => {
      // Le filtre de statut porte sur les machines : un magasin sans aucune
      // imprimante du statut demande n'a rien a montrer.
      if (filtre !== 'tous' && !m.imprimantes.some(i => i.statut === filtre)) return false
      if (!q) return true
      const champs = [
        m.nom, m.ville,
        ...m.imprimantes.flatMap(i => [i.magasin, i.serial, i.adresse]),
        ...m.acces.flatMap(a => [a.identifiant, a.service, a.notes]),
      ]
      return champs.some(v => v?.toLowerCase().includes(q))
    })
  }, [magasins, recherche, filtre])

  const machines = magasins.reduce((s, m) => s + m.imprimantes.length, 0)
  const comptes = magasins.reduce((s, m) => s + m.acces.length, 0)
  const sansMachine = magasins.filter(m => m.imprimantes.length === 0).length

  async function enregistrer() {
    if (!edition?.magasin.trim() || enCours) return
    setEnCours(true)
    if (edition.id) await update(edition.id, edition)
    else await create(edition)
    await refetch()
    setEnCours(false)
    setEdition(null)
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Imprimantes"
        sub="Une fiche par magasin · machines et accès au site d’étiquettes"
        accent={ACCENT}
        icon={Printer}
        iconInk="var(--ink-light)"
      />

      <KpiGrid>
        <KpiCard label="Magasins"        value={String(magasins.length)} accent={ACCENT} />
        <KpiCard label="Machines"        value={String(machines)} accent={ACCENT} />
        <KpiCard label="Accès au site"   value={String(comptes)} accent={ACCENT} />
        <KpiCard label="Sans imprimante" value={String(sansMachine)} sub="accès seul" accent={ACCENT} />
      </KpiGrid>

      <SectionCard
        title="Magasins équipés"
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
                   placeholder="Magasin, n° de série, adresse, identifiant…"
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
            {magasins.length === 0
              ? 'Aucun magasin équipé. Ajoute une première imprimante.'
              : 'Aucun magasin ne correspond à cette recherche.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {visibles.map(m => {
              const dépliée = ouverte === m.clientId
              return (
                <div key={m.clientId} style={{ border: '2px solid var(--ink)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                  <div className="flex items-center justify-between gap-3" style={{ padding: '10px 12px', cursor: 'pointer' }}
                       onClick={() => setOuverte(dépliée ? null : m.clientId)}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...DF, fontWeight: 800, fontSize: 13 }}>{m.nom}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {m.ville ?? 'ville inconnue'}
                        {' · '}
                        {m.imprimantes.length === 0
                          ? 'aucune machine'
                          : `${m.imprimantes.length} machine${m.imprimantes.length > 1 ? 's' : ''}`}
                        {' · '}
                        {m.acces.length} accès
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                                   border: '2px solid var(--ink)',
                                   background: m.imprimantes.length ? 'var(--accent-sport)' : 'var(--bg-input)',
                                   color: 'var(--ink-dark)' }}>
                      {m.imprimantes.length ? 'Équipé' : 'Accès seul'}
                    </span>
                  </div>

                  {dépliée && (
                    <div style={{ borderTop: '2px solid var(--ink)', padding: 12, display: 'grid', gap: 12 }}>
                      <div>
                        <p style={{ ...DF, fontWeight: 800, fontSize: 12, marginBottom: 6 }}>
                          Imprimantes ({m.imprimantes.length})
                        </p>
                        {m.imprimantes.length === 0 ? (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Ce magasin a un accès au site mais aucune machine mise à disposition.
                          </p>
                        ) : (
                          <div style={{ display: 'grid', gap: 6 }}>
                            {m.imprimantes.map(i => {
                              const st = STATUTS.find(s => s.value === i.statut) ?? STATUTS[3]
                              return (
                                <div key={i.id} style={{ display: 'grid', gap: 4, padding: 8, fontSize: 12,
                                                         border: '2px solid var(--ink)', borderRadius: 8 }}>
                                  <div className="flex items-center justify-between gap-2">
                                    <code style={{ fontWeight: 700 }}>{i.serial ?? 'sans n° de série'}</code>
                                    <span className="flex items-center gap-1">
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                                                     border: '2px solid var(--ink)', background: st.couleur, color: 'var(--ink-dark)' }}>
                                        {st.label}
                                      </span>
                                      <button onClick={() => setEdition({ ...i })} title="Modifier"
                                              style={{ padding: 3, border: '2px solid var(--ink)', borderRadius: 6, background: 'var(--bg-card)' }}>
                                        <Pencil size={11} />
                                      </button>
                                      <button title="Supprimer"
                                              onClick={async () => {
                                                if (confirm(`Supprimer la machine ${i.serial ?? ''} de « ${m.nom} » ?`)) {
                                                  await remove(i.id); await refetch()
                                                }
                                              }}
                                              style={{ padding: 3, border: '2px solid var(--ink)', borderRadius: 6, background: 'var(--bg-card)' }}>
                                        <Trash2 size={11} />
                                      </button>
                                    </span>
                                  </div>
                                  <div style={{ color: 'var(--text-muted)' }}>
                                    {i.modele}
                                    {i.date_mise_a_dispo ? ` · envoyée le ${i.date_mise_a_dispo}` : ''}
                                    {` · document ${i.document_signe ? 'signé' : 'non signé'}`}
                                  </div>
                                  {i.adresse && <div>{i.adresse}</div>}
                                  {i.notes && <div style={{ color: 'var(--text-muted)' }}>{i.notes}</div>}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div style={{ borderTop: '1px dashed var(--ink)', paddingTop: 10 }}>
                        <p style={{ ...DF, fontWeight: 800, fontSize: 12, marginBottom: 6 }}>
                          Accès au site d’étiquettes ({m.acces.length})
                        </p>
                        {m.clientId.startsWith('sans-client:')
                          ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Rattache d’abord ces machines à un client : les accès appartiennent au magasin, pas à la machine.
                            </p>
                          : <AccesClient clientId={m.clientId} />}
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
