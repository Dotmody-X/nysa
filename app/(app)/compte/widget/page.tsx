'use client'
import { useState } from 'react'
import { PageTitle, SectionCard, StickerButton } from '@/components/ui/PageTitle'
import { Copy, Check, AlertTriangle } from '@/components/ui/icons'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const ACCENT = 'var(--accent-brand)'

/**
 * Mise en place du widget iOS.
 *
 * iOS réserve les widgets aux applications natives : une webapp ne peut pas en
 * fournir. Scriptable comble le trou — il exécute du JavaScript et dessine de
 * vrais widgets. Reste à lui donner de quoi lire les données, d'où cette page.
 */
export default function WidgetPage() {
  const [jeton, setJeton] = useState<string | null>(null)
  const [souci, setSouci] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [copie, setCopie] = useState(false)

  async function fabriquer() {
    setEnCours(true); setSouci(null)
    try {
      const r = await fetch('/api/widget/token', { method: 'POST' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Échec')
      setJeton(j.refresh_token)
    } catch (e) {
      setSouci(e instanceof Error ? e.message : String(e))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760 }}>
      <PageTitle title="Widget iPhone" sub="Mise en place via Scriptable" accent={ACCENT} />

      <SectionCard title="Comment ça marche" accent={ACCENT}>
        <div style={{ fontSize: 13, lineHeight: 1.7, display: 'grid', gap: 10 }}>
          <p>
            iOS réserve les widgets aux applications natives. Nysa étant une webapp,
            elle ne peut pas en fournir directement — mais <strong>Scriptable</strong>,
            application gratuite, exécute du JavaScript et dessine de vrais widgets
            posés sur l’écran d’accueil.
          </p>
          <ol style={{ paddingLeft: 18, display: 'grid', gap: 6 }}>
            <li>Installe <strong>Scriptable</strong> depuis l’App Store.</li>
            <li>Fabrique le jeton ci-dessous et copie-le.</li>
            <li>Dans Scriptable, crée un script nommé <code>Nysa</code> et colle le code fourni.</li>
            <li>Lance-le une fois : il demande le jeton, le range dans le trousseau, et ne le redemande plus.</li>
            <li>Sur l’écran d’accueil, ajoute un widget Scriptable et choisis le script <code>Nysa</code>.</li>
          </ol>
        </div>
      </SectionCard>

      <SectionCard title="Jeton du widget" accent={ACCENT}>
        <div style={{ display: 'grid', gap: 10 }}>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            Ce jeton ouvre une session <strong>distincte</strong> de celle de ton navigateur :
            en fabriquer un ne te déconnectera de nulle part, et le widget ne perturbera
            pas tes autres sessions.
          </p>

          <p className="flex items-start gap-2" style={{ fontSize: 12, padding: 10, borderRadius: 8,
                       border: '2px solid var(--ink)', background: 'var(--accent-recettes)',
                       color: 'var(--ink-dark)' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Il donne accès à tes données Nysa, comme un mot de passe. Ne le colle nulle part
              ailleurs que dans Scriptable, sur ton téléphone.
            </span>
          </p>

          {!jeton ? (
            <div>
              <StickerButton accent={ACCENT} onClick={fabriquer}>
                {enCours ? 'Fabrication…' : 'Fabriquer un jeton'}
              </StickerButton>
              {souci && (
                <p style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>{souci}</p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <code style={{ padding: 10, fontSize: 11, wordBreak: 'break-all', lineHeight: 1.5,
                             background: 'var(--bg-input)', border: '2px solid var(--ink)',
                             borderRadius: 8 }}>
                {jeton}
              </code>
              <div className="flex items-center gap-2">
                <StickerButton accent={ACCENT} tilt="none" onClick={async () => {
                  await navigator.clipboard.writeText(jeton)
                  setCopie(true); setTimeout(() => setCopie(false), 2000)
                }}>
                  {copie ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
                </StickerButton>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Il ne sera plus affiché : referme cette page une fois collé.
                </span>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
