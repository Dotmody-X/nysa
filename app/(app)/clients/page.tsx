'use client'
import { useState, useMemo } from 'react'
import { Users, Plus, Search, Trash2, Pencil, X } from '@/components/ui/icons'
import { PageTitle, KpiGrid, KpiCard, SectionCard, StickerButton } from '@/components/ui/PageTitle'
import { useClients } from '@/hooks/useClients'
import type { Client, ClientStatut } from '@/types'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ACCENT = 'var(--accent-clients)'

const STATUTS: { value: ClientStatut; label: string; couleur: string }[] = [
  { value: 'actif',    label: 'Actif',    couleur: 'var(--accent-sport)' },
  { value: 'prospect', label: 'Prospect', couleur: 'var(--accent-todo)' },
  { value: 'inactif',  label: 'Inactif',  couleur: 'var(--text-muted)' },
  { value: 'archive',  label: 'Archivé',  couleur: 'var(--text-muted)' },
]

const champ: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13, color: 'var(--text)',
  background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 8,
}

type Brouillon = Partial<Client> & { name: string }
const VIDE: Brouillon = { name: '', ville: '', pays: 'France', vendeur: '', email: '', phone: '', statut: 'actif' }

export default function ClientsPage() {
  const { clients, loading, create, update, remove } = useClients()
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<ClientStatut | 'tous'>('tous')
  const [edition, setEdition] = useState<Brouillon | null>(null)
  const [enCours, setEnCours] = useState(false)

  const vendeurs = useMemo(
    () => [...new Set(clients.map(c => c.vendeur).filter(Boolean))].sort() as string[],
    [clients],
  )

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return clients.filter(c => {
      if (filtre !== 'tous' && c.statut !== filtre) return false
      if (!q) return true
      return [c.name, c.company, c.ville, c.vendeur, c.email]
        .some(v => v?.toLowerCase().includes(q))
    })
  }, [clients, recherche, filtre])

  async function enregistrer() {
    if (!edition?.name.trim() || enCours) return
    setEnCours(true)
    if (edition.id) await update(edition.id, edition)
    else await create(edition)
    setEnCours(false)
    setEdition(null)
  }

  async function supprimer(c: Client) {
    // Un client supprimé délie ses tâches, projets et temps (ON DELETE SET NULL) :
    // rien n'est perdu, mais le rattachement l'est.
    if (!confirm(`Supprimer « ${c.name} » ? Ses tâches, projets et temps seront simplement déliés.`)) return
    await remove(c.id)
  }

  const actifs = clients.filter(c => c.statut === 'actif').length

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageTitle
        title="Clients"
        sub="Magasins, enseignes et comptes rattachés"
        accent={ACCENT}
        icon={Users}
        iconInk="var(--ink-light)"
      />

      <KpiGrid>
        <KpiCard label="Clients"   value={String(clients.length)} accent={ACCENT} />
        <KpiCard label="Actifs"    value={String(actifs)} sub={`${clients.length - actifs} autres`} accent={ACCENT} />
        <KpiCard label="Vendeurs"  value={String(vendeurs.length)} accent={ACCENT} />
        <KpiCard label="Affichés"  value={String(visibles.length)} accent={ACCENT} />
      </KpiGrid>

      <SectionCard
        title="Répertoire"
        accent={ACCENT}
        action={
          <StickerButton accent={ACCENT} onClick={() => setEdition({ ...VIDE })}>
            <Plus size={13} /> Nouveau client
          </StickerButton>
        }
      >
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
          <div className="flex items-center gap-2" style={{ ...champ, width: 'auto', flex: '1 1 220px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Nom, ville, vendeur, e-mail…"
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: 'var(--text)' }}
            />
          </div>
          <select value={filtre} onChange={e => setFiltre(e.target.value as ClientStatut | 'tous')}
                  style={{ ...champ, width: 'auto' }}>
            <option value="tous">Tous les statuts</option>
            {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</p>
        ) : visibles.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {clients.length === 0
              ? 'Aucun client pour le moment. Crée le premier, ou importe-les depuis le Cerveau.'
              : 'Aucun client ne correspond à cette recherche.'}
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--ink)' }}>
                  {['Nom', 'Ville', 'Vendeur', 'Contact', 'Statut', ''].map((h, i) => (
                    <th key={i} style={{ ...DF, textAlign: 'left', padding: '6px 8px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map(c => {
                  const st = STATUTS.find(s => s.value === c.statut) ?? STATUTS[0]
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--ink-soft, rgba(0,0,0,.12))' }}>
                      <td style={{ padding: '8px', fontWeight: 700 }}>
                        {c.name}
                        {c.company && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {c.company}</span>}
                      </td>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{c.ville || '—'}</td>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{c.vendeur || '—'}</td>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{c.email || c.phone || '—'}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                                       border: '2px solid var(--ink)', background: st.couleur, color: 'var(--ink-dark)' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => setEdition({ ...c })} title="Modifier"
                                style={{ padding: 5, marginRight: 4, border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--bg-card)' }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => supprimer(c)} title="Supprimer"
                                style={{ padding: 5, border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--bg-card)' }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
                {edition.id ? 'Modifier le client' : 'Nouveau client'}
              </p>
              <button onClick={() => setEdition(null)} style={{ padding: 5, border: '2px solid var(--ink)', borderRadius: 7, background: 'var(--bg-card)' }}>
                <X size={13} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Nom du magasin *
                <input autoFocus value={edition.name} onChange={e => setEdition({ ...edition, name: e.target.value })} style={{ ...champ, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Enseigne / société
                <input value={edition.company ?? ''} onChange={e => setEdition({ ...edition, company: e.target.value })} style={{ ...champ, marginTop: 4 }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Ville
                  <input value={edition.ville ?? ''} onChange={e => setEdition({ ...edition, ville: e.target.value })} style={{ ...champ, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Pays
                  <input value={edition.pays ?? ''} onChange={e => setEdition({ ...edition, pays: e.target.value })} style={{ ...champ, marginTop: 4 }} />
                </label>
              </div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>
                Adresse
                <input value={edition.adresse ?? ''} onChange={e => setEdition({ ...edition, adresse: e.target.value })} style={{ ...champ, marginTop: 4 }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  E-mail
                  <input type="email" value={edition.email ?? ''} onChange={e => setEdition({ ...edition, email: e.target.value })} style={{ ...champ, marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Téléphone
                  <input value={edition.phone ?? ''} onChange={e => setEdition({ ...edition, phone: e.target.value })} style={{ ...champ, marginTop: 4 }} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Vendeur
                  <input list="vendeurs" value={edition.vendeur ?? ''} onChange={e => setEdition({ ...edition, vendeur: e.target.value })} style={{ ...champ, marginTop: 4 }} />
                  <datalist id="vendeurs">{vendeurs.map(v => <option key={v} value={v} />)}</datalist>
                </label>
                <label style={{ fontSize: 12, fontWeight: 700 }}>
                  Statut
                  <select value={edition.statut ?? 'actif'} onChange={e => setEdition({ ...edition, statut: e.target.value as ClientStatut })} style={{ ...champ, marginTop: 4 }}>
                    {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
              </div>
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
