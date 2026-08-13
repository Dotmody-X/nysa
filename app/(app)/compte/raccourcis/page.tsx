'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from '@/components/ui/icons'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = 'var(--azul)', WHEAT = 'var(--text)'

const SHORTCUTS: { category: string; items: { keys: string[]; label: string }[] }[] = [
  {
    category: 'Navigation',
    items: [
      { keys: ['G', 'H'], label: 'Aller à l\'accueil' },
      { keys: ['G', 'T'], label: 'Aller au Time Tracker' },
      { keys: ['G', 'C'], label: 'Aller au calendrier' },
      { keys: ['G', 'P'], label: 'Aller aux projets' },
      { keys: ['G', 'D'], label: 'Aller à la To Do List' },
      { keys: ['G', 'B'], label: 'Aller au budget' },
      { keys: ['G', 'R'], label: 'Aller aux rapports' },
    ],
  },
  {
    category: 'Time Tracker',
    items: [
      { keys: ['Space'], label: 'Démarrer / Stopper le timer' },
      { keys: ['⌘', 'N'], label: 'Nouvelle entrée manuelle' },
      { keys: ['⌘', 'E'], label: 'Exporter CSV' },
    ],
  },
  {
    category: 'Tâches',
    items: [
      { keys: ['⌘', 'K'], label: 'Créer une nouvelle tâche' },
      { keys: ['⌘', 'Enter'], label: 'Valider / Compléter la tâche sélectionnée' },
      { keys: ['Delete'], label: 'Supprimer la tâche sélectionnée' },
      { keys: ['↑', '↓'], label: 'Naviguer dans la liste' },
    ],
  },
  {
    category: 'Calendrier',
    items: [
      { keys: ['⌘', 'N'], label: 'Nouvel événement' },
      { keys: ['T'], label: 'Aller à aujourd\'hui' },
      { keys: ['←', '→'], label: 'Semaine précédente / suivante' },
      { keys: ['1'], label: 'Vue Jour' },
      { keys: ['2'], label: 'Vue Semaine' },
      { keys: ['3'], label: 'Vue Mois' },
    ],
  },
  {
    category: 'Interface',
    items: [
      { keys: ['⌘', 'B'], label: 'Masquer / Afficher la sidebar' },
      { keys: ['⌘', ','], label: 'Ouvrir les préférences' },
      { keys: ['Esc'], label: 'Fermer le modal actif' },
      { keys: ['?'], label: 'Afficher cette aide' },
    ],
  },
]

function Kbd({ k }: { k: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 22, padding: '0 6px', background: 'var(--bg-input)', border: '2px solid var(--ink)', borderRadius: 5, fontSize: 10, color: 'var(--text)', ...DF, fontWeight: 700, boxShadow: '2px 2px 0 var(--ink)' }}>
      {k}
    </span>
  )
}

export default function RaccourcisPage() {
  const router = useRouter()

  return (
    <div style={{ padding: '28px 32px', maxWidth: 640, margin: '0 auto' }}>

      <button onClick={() => router.push('/compte')} className="nb-press"
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', color: 'var(--text)', fontSize: 11, marginBottom: 24, padding: '8px 14px', fontWeight: 700 }}>
        <ArrowLeft size={13} /> Retour au profil
      </button>

      <h1 style={{ ...DF, fontWeight: 900, fontSize: 36, color: WHEAT, letterSpacing: '-0.02em', marginBottom: 4 }}>RACCOURCIS.</h1>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 28 }}>Raccourcis clavier disponibles</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SHORTCUTS.map(cat => (
          <div key={cat.category} style={{ background: 'var(--bg-card)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '2px solid var(--ink)', background: 'var(--bg-input)' }}>
              <p style={{ ...DF, fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: TEAL, textTransform: 'uppercase' }}>{cat.category}</p>
            </div>
            {cat.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', borderBottom: i < cat.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <p style={{ fontSize: 12, color: 'var(--text)' }}>{item.label}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {item.keys.map((k, ki) => (
                    <span key={ki} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Kbd k={k} />
                      {ki < item.keys.length - 1 && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 20, textAlign: 'center' }}>
        Les raccourcis avec ⌘ utilisent Ctrl sur Windows et Linux
      </p>
    </div>
  )
}
