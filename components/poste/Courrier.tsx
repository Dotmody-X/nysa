'use client'

import { useMemo, useState } from 'react'
import { Send, Check, CheckSquare, Sparkles, Package, Calendar, PenLine, Loader2 } from '@/components/ui/icons'
import type { useInbox, InboxItem } from '@/hooks/useInbox'
import { brandColor, toneColor } from '@/lib/digestStyle'
import { DF, WHEAT, panneau, titrePanneau, boutonDiscret, depuis, BRAND_LABEL, BRAND_NAME } from './ui'

type Filtre = 'tous' | 'mixologue' | 'aeterna'

const TYPE_ICON: Record<string, typeof Send> = { mail: Send, order: Package, appointment: Calendar }

const CATEGORIE_LABEL: Record<string, string> = {
  commande: 'Commande', fournisseur: 'Fournisseur', client: 'Client', facture: 'Facture', admin: 'Admin',
  rdv: 'Rendez-vous', pub: 'Pub', spam: 'Spam', autre: 'Autre',
}
/** Ce qu'on peut laisser dormir : Claude l'a dit, on l'atténue sans le cacher. */
const SANS_INTERET = new Set(['pub', 'spam'])

function Ligne({ item, onTraite, onTache, onDiscord, onBrouillon }: {
  item: InboxItem
  onTraite: () => void
  onTache: () => void
  onDiscord: () => void
  onBrouillon: () => void
}) {
  const Icon = TYPE_ICON[item.type] ?? Send
  const couleur = item.brand ? brandColor(BRAND_NAME[item.brand]) : 'var(--text-muted)'
  const urgent = item.urgency === 1
  const expediteur = (item.expediteur ?? '').replace(/\s*<[^>]*>\s*$/, '') || item.expediteur || '—'
  const ai = item.ai && !item.ai.echec ? item.ai : null
  const dormant = ai?.categorie ? SANS_INTERET.has(ai.categorie) : false
  // Un mail des dernières 48 h sans fiche : le triage est en route.
  const recent = Date.now() - new Date(item.occurred_at).getTime() < 48 * 3_600_000

  return (
    <div style={{ display: 'flex', gap: 12, padding: '11px 16px', borderBottom: '1px solid var(--border)', borderLeft: `6px solid ${urgent ? toneColor('danger') : 'transparent'}`, opacity: dormant ? 0.55 : 1 }}>
      <span className="nb-tile" title={item.brand ? BRAND_LABEL[item.brand] : ''}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, background: couleur, boxShadow: '2px 2px 0 var(--ink)', flexShrink: 0, marginTop: 1 }}>
        <Icon size={13} style={{ color: 'var(--ink-light)' }} />
      </span>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ ...DF, fontSize: 14, fontWeight: 800, color: WHEAT, lineHeight: 1.25, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title || '(sans objet)'}
          </span>
          {ai?.categorie && (
            <span style={{ ...DF, fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: dormant ? 'var(--text-muted)' : 'var(--azul)', whiteSpace: 'nowrap' }}>
              {CATEGORIE_LABEL[ai.categorie] ?? ai.categorie}{ai.lien ? ` · ${ai.lien}` : ''}
            </span>
          )}
          {urgent && <span style={{ ...DF, fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', color: toneColor('danger') }}>URGENT</span>}
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{depuis(item.occurred_at)}</span>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {expediteur}
          {item.boite && <span style={{ opacity: 0.7 }}> → {item.boite.split('@')[0]}</span>}
          {item.pieces > 0 && <span> · {item.pieces} pièce{item.pieces > 1 ? 's' : ''}</span>}
        </div>
        {/* La fiche de Claude si elle existe, sinon l'extrait brut ; en attendant, un petit sablier. */}
        {ai?.resume ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p style={{ fontSize: 12.5, color: WHEAT, lineHeight: 1.45 }}>
              <Sparkles size={10} style={{ color: 'var(--azul)', marginRight: 5, position: 'relative', top: 1 }} />
              {ai.resume}
            </p>
            {ai.action && ai.action.toLowerCase() !== 'rien' && (
              <p style={{ fontSize: 12, color: 'var(--azul)', lineHeight: 1.4, fontWeight: 600 }}>→ {ai.action}</p>
            )}
          </div>
        ) : item.extrait ? (
          <p style={{ fontSize: 12.5, color: WHEAT, opacity: 0.85, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.extrait}
          </p>
        ) : null}
        {!ai && recent && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Loader2 size={9} className="animate-spin" /> Claude lit…</span>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <button className="nb-press" onClick={onTraite} style={boutonDiscret()}><Check size={11} /> Traité</button>
          <button className="nb-press" onClick={onTache} style={boutonDiscret()}><CheckSquare size={11} /> Tâche</button>
          <button className="nb-press" onClick={onDiscord} style={boutonDiscret({ color: 'var(--azul)' })} title="Envoyer le mail dans le salon Discord de la marque, et en parler là-bas">
            <Sparkles size={11} /> Discord
          </button>
          {item.type === 'mail' && (
            <button className="nb-press" onClick={onBrouillon} style={boutonDiscret({ color: 'var(--azul)' })} title="Claude rédige un brouillon de réponse dans Discord">
              <PenLine size={11} /> Brouillon
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Le courrier en direct : ce que nysa-mail dépose dans work.events, trié
 * urgence puis date. Quatre gestes par ligne — traité, tâche, Discord,
 * brouillon — et rien à taper : ce qui demande des mots se dit dans Discord.
 */
export function Courrier({ inbox, onTache, onDiscord, onBrouillon }: {
  inbox: ReturnType<typeof useInbox>
  onTache: (item: InboxItem) => Promise<void>
  onDiscord: (item: InboxItem) => Promise<void>
  onBrouillon: (item: InboxItem) => Promise<void>
}) {
  const { items, pulse, loading, error, marquerTraite } = inbox
  const [filtre, setFiltre] = useState<Filtre>('tous')

  const visibles = useMemo(() => items.filter(i => filtre === 'tous' || i.brand === filtre), [items, filtre])
  const anciens = useMemo(() => {
    const limite = Date.now() - 7 * 86_400_000
    return items.filter(i => new Date(i.occurred_at).getTime() < limite).map(i => i.id)
  }, [items])

  // Le pouls : si nysa-mail se tait, c'est ici que ça se voit.
  const dernier = pulse?.last_mail_at ?? null
  const silence = dernier ? Date.now() - new Date(dernier).getTime() > 3 * 86_400_000 : false

  const chip = (actif: boolean, couleur: string): React.CSSProperties => ({
    ...boutonDiscret({ background: actif ? couleur : 'var(--bg-input)', color: actif ? 'var(--ink-light)' : 'var(--text-muted)', boxShadow: actif ? '2px 2px 0 var(--ink)' : 'none' }),
  })

  return (
    <section style={panneau()}>
      <div style={{ padding: '12px 16px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '2px solid var(--ink)' }}>
        <Send size={13} style={{ color: 'var(--azul)' }} />
        <span style={titrePanneau}>Courrier</span>
        <span style={{ ...DF, fontSize: 11, fontWeight: 900, color: 'var(--ink-light)', background: 'var(--azul)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-sm)', padding: '1px 7px' }}>{items.length}</span>
        <span style={{ flex: 1 }} />
        <span title="Dernier mail reçu par nysa-mail" style={{ fontSize: 10.5, fontWeight: 700, color: silence ? toneColor('danger') : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          dernier mail {depuis(dernier)}{silence ? ' — le service se tait ?' : ''}
        </span>
      </div>

      <div style={{ padding: '8px 16px', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <button className="nb-press" style={chip(filtre === 'tous', 'var(--ink-dark)')} onClick={() => setFiltre('tous')}>Tout</button>
        <button className="nb-press" style={chip(filtre === 'mixologue', brandColor('Le Mixologue'))} onClick={() => setFiltre('mixologue')}>Mixologue</button>
        <button className="nb-press" style={chip(filtre === 'aeterna', brandColor('Aeterna'))} onClick={() => setFiltre('aeterna')}>Aeterna</button>
        <span style={{ flex: 1 }} />
        {anciens.length > 0 && (
          <button className="nb-press" onClick={() => marquerTraite(anciens)} style={boutonDiscret()} title="Marquer traité tout ce qui a plus de sept jours">
            <Check size={11} /> Archiver {anciens.length} anciens
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {error && <p style={{ padding: 16, fontSize: 12, color: 'var(--accent-brand)' }}>Courrier indisponible : {error}</p>}
        {loading ? (
          <p style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</p>
        ) : visibles.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>Rien à traiter. Le prochain mail apparaîtra ici tout seul.</p>
        ) : (
          visibles.map(item => (
            <Ligne key={item.id} item={item}
              onTraite={() => marquerTraite([item.id])}
              onTache={() => onTache(item)}
              onDiscord={() => onDiscord(item)}
              onBrouillon={() => onBrouillon(item)} />
          ))
        )}
      </div>
    </section>
  )
}
