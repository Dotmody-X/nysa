'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from '@/components/ui/icons'
import { useMemoire, type Regle } from '@/hooks/useMemoire'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = 'var(--azul)', WHEAT = 'var(--text)'
const CARTE: React.CSSProperties = {
  background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)',
  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
}

const ORIGINE: Record<Regle['origine'], string> = {
  correction: 'Tu l’as corrigée',
  explicite: 'Tu l’as dit',
  deduit: 'Remarqué par Nysa',
  lexique: 'Lexique commun du cerveau',
}
const TYPE: Record<Regle['type'], string> = {
  alias: 'Surnoms', regle: 'Règles', preference: 'Préférences', erreur: 'Erreurs à éviter',
}

function quand(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' })
}

function Ligne({ r, action, libelle }: { r: Regle; action: () => void; libelle: string }) {
  const usage = r.utilisations
    ? `servi ${r.utilisations} fois${r.derniere_utilisation ? `, la dernière le ${quand(r.derniere_utilisation)}` : ''}`
    : 'pas encore servi'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}>
          « {r.cle} » <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>→</span> {r.valeur}
        </p>
        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
          {ORIGINE[r.origine]} · {usage}
          {r.exemple ? ` · « ${r.exemple.slice(0, 80)} »` : ''}
        </p>
      </div>
      <button onClick={action} className="nb-press"
        style={{ flexShrink: 0, background: 'var(--bg-input)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0 var(--ink)', borderRadius: 8, padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}>
        {libelle}
      </button>
    </div>
  )
}

function Bloc({ titre, enfants }: { titre: string; enfants: React.ReactNode }) {
  return (
    <div style={CARTE}>
      <div style={{ padding: '12px 18px', borderBottom: '2px solid var(--ink)', background: 'var(--bg-input)' }}>
        <p style={{ ...DF, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: TEAL, textTransform: 'uppercase' }}>{titre}</p>
      </div>
      {enfants}
    </div>
  )
}

export default function MemoirePage() {
  const router = useRouter()
  const { regles, corrections, loading, error, retirer, remettre, confirmer } = useMemoire()

  const aConfirmer = regles.filter(r => r.statut === 'a_confirmer')
  const actives = regles.filter(r => r.statut === 'active')
  const retirees = regles.filter(r => r.statut === 'retiree')
  const types = (Object.keys(TYPE) as Regle['type'][]).filter(t => actives.some(r => r.type === t))

  return (
    <div style={{ padding: '28px 32px', maxWidth: 680, margin: '0 auto' }}>

      <button onClick={() => router.push('/compte')} className="nb-press"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', color: 'var(--text)', fontSize: 11, marginBottom: 24, padding: '8px 14px', fontWeight: 700 }}>
        <ArrowLeft size={13} /> Retour au profil
      </button>

      <h1 style={{ ...DF, fontWeight: 900, fontSize: 36, color: WHEAT, letterSpacing: '-0.02em', marginBottom: 4 }}>CE QUE NYSA A APPRIS.</h1>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
        Ses règles, nées de tes corrections
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.5 }}>
        Quand tu corriges Nysa, elle en fait une règle et ne refait plus l’erreur. Tout se voit ici, et une règle se retire d’un geste.
        Rien n’est effacé : une règle retirée peut être remise.
      </p>

      {loading && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</p>}
      {error && <p style={{ fontSize: 12, color: 'var(--danger, #c0392b)' }}>Lecture impossible : {error}</p>}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {aConfirmer.length > 0 && (
            <Bloc titre={`À confirmer (${aConfirmer.length})`} enfants={aConfirmer.map(r =>
              <Ligne key={r.id} r={r} action={() => confirmer(r.id)} libelle="C’est juste" />)} />
          )}

          {types.length === 0 && (
            <div style={{ ...CARTE, padding: '18px' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rien encore. Corrige Nysa une fois (« non, c’est Le Mixologue ») : la règle apparaîtra ici.</p>
            </div>
          )}

          {types.map(t => (
            <Bloc key={t} titre={`${TYPE[t]} (${actives.filter(r => r.type === t).length})`} enfants={
              actives.filter(r => r.type === t).map(r => <Ligne key={r.id} r={r} action={() => retirer(r.id)} libelle="Retirer" />)} />
          ))}

          {corrections.length > 0 && (
            <Bloc titre="Dernières corrections" enfants={corrections.map(c => (
              <div key={c.id} style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text)' }}>« {c.demande} »</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                  {c.compris ? `Compris : ${c.compris} · ` : ''}Voulu : {c.voulu} · {quand(c.created_at)}
                </p>
              </div>
            ))} />
          )}

          {retirees.length > 0 && (
            <Bloc titre={`Retirées (${retirees.length})`} enfants={retirees.map(r =>
              <Ligne key={r.id} r={r} action={() => remettre(r.id)} libelle="Remettre" />)} />
          )}
        </div>
      )}
    </div>
  )
}
