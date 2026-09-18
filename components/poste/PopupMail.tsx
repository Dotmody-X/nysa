'use client'

import { useCallback, useEffect, useState } from 'react'
import { Send, Package, Calendar, Check, CheckSquare, Sparkles, PenLine, X, Loader2, Link2 } from '@/components/ui/icons'
import { createClient } from '@/lib/supabase/client'
import type { InboxItem } from '@/hooks/useInbox'
import { brandColor, toneColor } from '@/lib/digestStyle'
import { DF, WHEAT, bouton, boutonDiscret, depuis, BRAND_LABEL, BRAND_NAME } from './ui'
import { estBat } from '@/lib/poste/actions'

const TYPE_ICON: Record<string, typeof Send> = { mail: Send, order: Package, appointment: Calendar }
const CATEGORIE_LABEL: Record<string, string> = {
  commande: 'Commande', fournisseur: 'Fournisseur', client: 'Client', facture: 'Facture', admin: 'Admin',
  rdv: 'Rendez-vous', pub: 'Pub', spam: 'Spam', autre: 'Autre',
}

/**
 * Le mail qui vient d'arriver, au centre de l'écran : qui, quoi, l'extrait,
 * et la lecture de Claude dès qu'elle est là (elle arrive quelques secondes
 * après, la fenêtre se met à jour seule). Les mêmes gestes que dans la
 * liste, et rien ne se ferme tout seul : c'est Nathan qui décide.
 */
export function PopupMail({ item, reste, onFermer, onTraite, onTache, onDiscord, onBrouillon, onValiderBat, onRefuserBat }: {
  item: InboxItem
  /** Combien d'autres attendent derrière celui-ci. */
  reste: number
  onFermer: () => void
  onTraite: () => void
  onTache: () => void
  onDiscord: () => void
  onBrouillon: () => void
  onValiderBat: () => void
  onRefuserBat: () => void
}) {
  const Icon = TYPE_ICON[item.type] ?? Send
  const couleur = item.brand ? brandColor(BRAND_NAME[item.brand]) : 'var(--azul)'
  const ai = item.ai && !item.ai.echec ? item.ai : null
  const urgent = item.urgency === 1
  const expediteur = (item.expediteur ?? '').replace(/\s*<[^>]*>\s*$/, '') || item.expediteur || '—'
  const adresse = item.expediteur?.match(/<([^>]+)>/)?.[1]
  const fichiers = item.fichiers ?? []
  const bat = estBat(item)
  const pdf = fichiers.find(f => f.type === 'application/pdf') ?? null
  const [apercu, setApercu] = useState<string | null>(null)

  // Un BAT se regarde avant de se valider : le PDF s'affiche dans la fenêtre.
  useEffect(() => {
    if (!bat || !pdf) { setApercu(null); return }
    let vivant = true
    createClient().storage.from('courrier').createSignedUrl(pdf.path, 600).then(({ data }) => { if (vivant && data?.signedUrl) setApercu(data.signedUrl) })
    return () => { vivant = false }
  }, [bat, pdf])

  // Le bucket est privé : une URL signée, valable dix minutes, ouverte dans un nouvel onglet.
  const ouvrir = useCallback(async (path: string) => {
    const { data } = await createClient().storage.from('courrier').createSignedUrl(path, 600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }, [])

  return (
    <div onClick={onFermer} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 'min(680px, 100%)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', border: '3px solid var(--ink)', borderTop: `14px solid ${couleur}`, borderRadius: 'var(--radius-lg)', boxShadow: '10px 10px 0 var(--ink)', overflow: 'hidden' }}>

        {/* En-tête : type, marque, quand */}
        <div style={{ padding: '16px 22px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="nb-tile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: couleur, boxShadow: '2px 2px 0 var(--ink)', flexShrink: 0 }}>
            <Icon size={17} style={{ color: 'var(--ink-light)' }} />
          </span>
          <span style={{ ...DF, fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: couleur }}>
            {item.brand ? BRAND_LABEL[item.brand] : 'Courrier'} · {item.type === 'order' ? 'commande' : item.type === 'appointment' ? 'rendez-vous' : 'nouveau mail'}
          </span>
          {urgent && <span style={{ ...DF, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', color: toneColor('danger') }}>URGENT</span>}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>{depuis(item.occurred_at)}</span>
          <button onClick={onFermer} aria-label="Fermer" style={{ ...boutonDiscret({ minHeight: 34, padding: '4px 8px' }) }}><X size={14} /></button>
        </div>

        <div style={{ padding: '14px 22px 0', overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ ...DF, fontSize: 24, fontWeight: 900, lineHeight: 1.1, color: WHEAT, letterSpacing: '-0.02em' }}>{item.title || '(sans objet)'}</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 13, color: WHEAT }}>
            <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', paddingTop: 2 }}>De</span>
            <span><strong>{expediteur}</strong>{adresse && adresse !== expediteur ? <span style={{ color: 'var(--text-muted)' }}> · {adresse}</span> : null}</span>
            {item.boite && <>
              <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', paddingTop: 2 }}>Boîte</span>
              <span>{item.boite}{item.pieces > 0 ? ` · ${item.pieces} pièce${item.pieces > 1 ? 's' : ''} jointe${item.pieces > 1 ? 's' : ''}` : ''}</span>
            </>}
          </div>

          {bat && (
            <div style={{ padding: '10px 14px', border: '2px solid var(--ink)', borderLeft: `8px solid ${toneColor('success')}`, borderRadius: 'var(--radius-sm)', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...DF, fontSize: 10, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: toneColor('success') }}>Bon à tirer</span>
                {item.etiquettes?.reference && <span style={{ ...DF, fontSize: 12, fontWeight: 800, color: WHEAT }}>{item.etiquettes.reference}</span>}
                {!item.etiquettes?.reference && <span style={{ fontSize: 11.5, color: toneColor('warning'), fontWeight: 700 }}>pas encore rattaché à une commande</span>}
              </div>
              {apercu ? (
                <iframe src={apercu} title={pdf?.name ?? 'BAT'} style={{ width: '100%', height: '38vh', border: '2px solid var(--ink)', borderRadius: 'var(--radius-sm)', background: '#fff' }} />
              ) : pdf ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={12} className="animate-spin" /> Le BAT se charge…</p>
              ) : null}
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Valider envoie « bon pour impression » à l’expéditeur, date le BAT et passe la commande en production. Refuser ouvre Discord pour dire quoi corriger.</p>
            </div>
          )}

          {/* La lecture de Claude, ou l'attente */}
          <div style={{ padding: '12px 14px', border: '2px solid var(--ink)', borderLeft: '8px solid var(--azul)', borderRadius: 'var(--radius-sm)', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <Sparkles size={13} style={{ color: 'var(--azul)' }} />
              <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--azul)' }}>Ce que c'est</span>
              {ai?.categorie && <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>· {CATEGORIE_LABEL[ai.categorie] ?? ai.categorie}{ai.lien ? ` · ${ai.lien}` : ''}</span>}
            </div>
            {ai?.resume ? (
              <>
                <p style={{ fontSize: 15, color: WHEAT, lineHeight: 1.5, fontWeight: 500 }}>{ai.resume}</p>
                {ai.action && ai.action.toLowerCase() !== 'rien' && (
                  <p style={{ fontSize: 13.5, color: 'var(--azul)', lineHeight: 1.45, fontWeight: 700, marginTop: 6 }}>→ {ai.action}</p>
                )}
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={12} className="animate-spin" /> Claude lit le mail — sa lecture s'affichera ici dans quelques secondes.
              </p>
            )}
          </div>

          {fichiers.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {fichiers.map(f => (
                <button key={f.path} className="nb-press" onClick={() => ouvrir(f.path)} title={`${Math.round(f.size / 1024)} ko`}
                  style={boutonDiscret({ textTransform: 'none', letterSpacing: 0, color: WHEAT })}>
                  <Link2 size={11} /> {f.name}
                </button>
              ))}
            </div>
          )}

          {(item.texte || item.extrait) && (
            <div>
              <span style={{ ...DF, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{item.texte ? 'Le message' : 'Extrait'}</span>
              <p style={{ fontSize: 13.5, color: WHEAT, lineHeight: 1.55, opacity: 0.9, marginTop: 4, whiteSpace: 'pre-wrap' }}>{item.texte || item.extrait}</p>
            </div>
          )}
        </div>

        {/* Les gestes */}
        <div style={{ padding: '14px 22px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderTop: '2px solid var(--ink)', marginTop: 14 }}>
          {bat && item.etiquettes?.reference && (
            <>
              <button className="nb-press" onClick={onValiderBat} style={bouton(toneColor('success'), 'var(--ink-light)', { minHeight: 46, fontSize: 13 })}><Check size={15} /> Valider le BAT</button>
              <button className="nb-press" onClick={onRefuserBat} style={bouton('var(--accent-brand)', 'var(--ink-light)', { minHeight: 46, fontSize: 13 })}><X size={15} /> Refuser</button>
              <span style={{ width: 8 }} />
            </>
          )}
          <button className="nb-press" onClick={onTraite} style={bouton('var(--bg-input)', WHEAT)}><Check size={14} /> Traité</button>
          <button className="nb-press" onClick={onTache} style={bouton('var(--bg-input)', WHEAT)}><CheckSquare size={14} /> Tâche</button>
          <button className="nb-press" onClick={onDiscord} style={bouton('var(--azul)')}><Sparkles size={14} /> Discord</button>
          {item.type === 'mail' && <button className="nb-press" onClick={onBrouillon} style={bouton('var(--azul)')}><PenLine size={14} /> Brouillon</button>}
          <span style={{ flex: 1 }} />
          {reste > 0 && <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>{reste} autre{reste > 1 ? 's' : ''} derrière</span>}
          <button className="nb-press" onClick={onFermer} style={boutonDiscret({ minHeight: 40 })}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
