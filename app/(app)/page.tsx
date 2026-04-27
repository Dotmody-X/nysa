import {
  Calendar, Timer, FolderKanban, CheckSquare,
  Heart, ShoppingCart, Wallet, TrendingUp,
  Clock, ArrowRight,
} from 'lucide-react'
import { Card }     from '@/components/ui/Card'
import { Badge }    from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'

// ── Données de démo ────────────────────────────────────────────────────────
const today = new Date().toLocaleDateString('fr-BE', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

const todayTasks = [
  { time: '09:00', title: 'Présentation client — Redesign',     project: 'Mixologue',  duration: '2h',    done: true  },
  { time: '11:30', title: 'Couche à 3 km · Rêve',               project: 'Health',     duration: '45min', done: true  },
  { time: '13:00', title: 'Réunion budget',                      project: 'Aeterna',    duration: '1h',    done: false },
  { time: '15:00', title: 'Création contenu Instagram — Avril',  project: 'E-Smoker',   duration: '2h',    done: false },
  { time: '17:30', title: 'Rapport mensuel',                     project: 'Mixologue',  duration: '45min', done: false },
]

const projectColor: Record<string, string> = {
  Mixologue: '#F2542D',
  Health:    '#0E9594',
  Aeterna:   '#11686A',
  'E-Smoker':'#F5DFBB',
}

const timeEntries = [
  { project: 'Mixologue',  task: 'Redesign Website',        duration: '2h 15min', billable: true  },
  { project: 'E-Smoker',   task: 'Contenu Instagram',       duration: '1h 45min', billable: true  },
  { project: 'Aeterna',    task: 'Réunion stratégie',       duration: '1h 00min', billable: false },
  { project: 'Health',     task: 'Running 5km',             duration: '0h 30min', billable: false },
]

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1400px]">

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight leading-none nysa-gradient-text">
            Focus.<br />Plan.<br />Progress.
          </h1>
          <p className="text-xs mt-3 capitalize" style={{ color: 'var(--text-muted)' }}>{today}</p>
        </div>

        {/* Alerte rapide */}
        <Card className="max-w-[220px] text-xs" style={{ background: 'rgba(242,84,45,0.08)', borderColor: 'rgba(242,84,45,0.2)' }}>
          <p className="font-semibold mb-1" style={{ color: '#F2542D' }}>Alert 🔴</p>
          <p style={{ color: 'var(--text-muted)' }}>
            Deadline Aeterna demain — 3 tâches en attente.
          </p>
          <button className="mt-2 text-[10px] font-semibold underline" style={{ color: '#F2542D' }}>
            Voir les tâches →
          </button>
        </Card>
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Calendrier"
          value="3"
          unit="évts"
          sub="Aujourd'hui"
          icon={<Calendar size={16} />}
          accent="cyan"
        />
        <StatCard
          label="Time Tracker"
          value="5h 30"
          sub="Logué aujourd'hui"
          icon={<Timer size={16} />}
          accent="fiery"
        />
        <StatCard
          label="Projets"
          value="2"
          unit="actifs"
          sub="1 deadline proche"
          icon={<FolderKanban size={16} />}
          accent="teal"
        />
        <StatCard
          label="To-Do List"
          value="5"
          unit="tâches"
          sub="3 restantes"
          icon={<CheckSquare size={16} />}
          accent="wheat"
        />
      </div>

      {/* ── ROW 2 : AUJOURD'HUI + TIME TRACKER ─────────────────────────── */}
      <div className="grid grid-cols-[1fr_1.4fr] gap-4">

        {/* Aujourd'hui */}
        <Card padding="none">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
              Aujourd&apos;hui
            </p>
            <button className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              + Ajouter
            </button>
          </div>
          <ul className="flex flex-col divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
            {todayTasks.map((t, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-[10px] w-10 shrink-0 pt-0.5" style={{ color: 'var(--text-subtle)' }}>{t.time}</span>
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: t.done ? 'var(--success)' : projectColor[t.project] ?? 'var(--border)' }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs leading-snug"
                    style={{
                      color:          t.done ? 'var(--text-muted)' : 'var(--wheat)',
                      textDecoration: t.done ? 'line-through' : 'none',
                    }}
                  >
                    {t.title}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-subtle)' }}>
                    {t.project} · {t.duration}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Time Tracker du jour */}
        <Card padding="none">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
              Time Tracker — Aujourd&apos;hui
            </p>
            <button className="text-[10px] flex items-center gap-1" style={{ color: '#0E9594' }}>
              <Clock size={10} /> Nouveau timer
            </button>
          </div>

          {/* Total */}
          <div className="flex items-end gap-4 px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total logué</p>
              <p className="text-3xl font-black" style={{ color: 'var(--wheat)' }}>2h 15m</p>
            </div>
            <div className="flex gap-1 items-end pb-1">
              {[40, 60, 80, 45, 90, 55, 70, 35, 85, 65, 50, 75].map((h, i) => (
                <div
                  key={i}
                  className="w-3 rounded-sm"
                  style={{
                    height:     `${h * 0.4}px`,
                    background: i === 8 ? '#F2542D' : 'rgba(14,149,148,0.4)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Entrées */}
          <ul className="flex flex-col divide-y px-0">
            {timeEntries.map((e, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: projectColor[e.project] ?? '#F5DFBB' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs" style={{ color: 'var(--wheat)' }}>{e.task}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{e.project}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {e.billable && <Badge variant="cyan" className="text-[9px]">Fact.</Badge>}
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{e.duration}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ── ROW 3 : HEALTH + BUDGET ─────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">

        {/* Health */}
        <Card className="col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={14} style={{ color: '#F2542D' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Health</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--wheat)' }}>72,4 <span className="text-sm font-normal">kg</span></p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>−0.3 kg cette semaine</p>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Dernier run : 5,2 km · 28min</p>
          </div>
        </Card>

        {/* Budget */}
        <Card className="col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={14} style={{ color: '#0E9594' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Budget</p>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--wheat)' }}>1 265 <span className="text-sm font-normal">€</span></p>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Dépenses ce mois</p>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-[10px]" style={{ color: '#0E9594' }}>+1 842 € revenus</p>
          </div>
        </Card>

        {/* Rapport global */}
        <Card className="col-span-2" style={{ background: 'rgba(14,149,148,0.06)', borderColor: 'rgba(14,149,148,0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} style={{ color: '#0E9594' }} />
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#0E9594' }}>Rapport Global</p>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { label: 'Heures totales', value: '4' },
              { label: 'Tâches faites',  value: '12' },
              { label: 'Temps logué',    value: '3h 20' },
              { label: 'Revenus',        value: '1 842€' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xl font-black" style={{ color: 'var(--wheat)' }}>{value}</p>
                <p className="text-[9px] mt-1 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button className="flex items-center gap-1 text-[10px] font-medium" style={{ color: '#0E9594' }}>
              Voir le rapport complet <ArrowRight size={10} />
            </button>
          </div>
        </Card>
      </div>

    </div>
  )
}
