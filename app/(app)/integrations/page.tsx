'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles, Link2, Apple, Award, CheckSquare, Activity, ChevronRight, RefreshCw,
} from '@/components/ui/icons'
import { PageTitle } from '@/components/ui/PageTitle'
import { createClient } from '@/lib/supabase/client'
import { useDigests } from '@/hooks/useDigests'
import { useMktPrinciples } from '@/hooks/useMktPrinciples'
import { useFormationMilestones } from '@/hooks/useFormationMilestones'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }

const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14,
  boxShadow: 'var(--elev-1)', overflow: 'hidden', display: 'flex', flexDirection: 'column', ...extra,
})

function ago(iso?: string | null) {
  if (!iso) return null
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `il y a ${Math.max(1, Math.floor(s / 60))} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  return `il y a ${Math.floor(s / 86400)} j`
}
function freshColor(iso?: string | null) {
  if (!iso) return 'var(--text-muted)'
  const days = (Date.now() - new Date(iso).getTime()) / 86400000
  if (days < 1.5) return 'var(--success)'
  if (days < 8) return 'var(--warning)'
  return 'var(--text-muted)'
}

type Status = 'ok' | 'warn' | 'off'
const STATUS_META: Record<Status, { label: string; color: string }> = {
  ok:   { label: 'Actif',        color: 'var(--success)' },
  warn: { label: 'En veille',    color: 'var(--warning)' },
  off:  { label: 'À configurer', color: 'var(--text-muted)' },
}

// ── Carte connexion ───────────────────────────────────────────────────────────
function ConnCard({ icon, name, status, detail, href, note }: {
  icon: React.ReactNode; name: string; status: Status; detail?: string; href?: string; note?: string
}) {
  const m = STATUS_META[status]
  const inner = (
    <div style={{ ...card(), padding: 14, gap: 10, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', flexShrink: 0 }}>{icon}</div>
        <span style={{ ...DF, fontSize: 14, fontWeight: 800, color: 'var(--text)', flex: 1 }}>{name}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, ...DF, color: m.color }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.color }} />{m.label}
        </span>
      </div>
      {detail && <p style={{ fontSize: 12, color: 'var(--text)' }}>{detail}</p>}
      {note && <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{note}</p>}
      {href && <span style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: 'var(--accent-time)', ...DF }}>Gérer <ChevronRight size={13} /></span>}
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

// ── Ligne tâche programmée ────────────────────────────────────────────────────
function AutoRow({ icon, color, name, cadence, output, when, href }: {
  icon: React.ReactNode; color: string; name: string; cadence: string; output: string; when?: string | null; href: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `color-mix(in srgb, ${color} 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ ...DF, fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{name}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cadence} · {output}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: freshColor(when) }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ago(when) ?? 'jamais'}</span>
          <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    </Link>
  )
}

export default function IntegrationsPage() {
  const { latestBrief, latestDebrief, loading: loadingDigests } = useDigests()
  const { doneCount: mktDone, principles } = useMktPrinciples()
  const { doneCount: formDone, milestones } = useFormationMilestones()

  const [apple, setApple] = useState<{ email?: string } | null>(null)
  const [icsCount, setIcsCount] = useState(0)
  const [strava, setStrava] = useState(false)

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data } = await supabase.from('integrations').select('provider, metadata')
      for (const row of (data ?? []) as { provider: string; metadata: any }[]) {
        if (row.provider === 'apple_calendar') setApple({ email: row.metadata?.email })
        if (row.provider === 'ics_feed') setIcsCount((row.metadata?.feeds ?? []).length)
        if (row.provider === 'strava') setStrava(true)
      }
    })()
  }, [])

  // Statut Claude déduit de la fraîcheur du dernier contenu généré
  const lastAuto = latestBrief?.generated_at ?? latestDebrief?.generated_at ?? null
  const claudeStatus: Status = !lastAuto ? 'off'
    : (Date.now() - new Date(lastAuto).getTime()) / 86400000 < 2 ? 'ok' : 'warn'

  const mktNext = principles.filter(p => p.status === 'pending').sort((a, b) => a.seq - b.seq)[0]
  const totalMkt = principles.length || 24
  const totalForm = milestones.length || 6

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100%' }}>
      <PageTitle title="Intégrations" sub="Claude · Notion · Tâches programmées" />

      {/* ── Connexions ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Connexions</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
          <ConnCard icon={<Sparkles size={17} />} name="Claude" status={claudeStatus}
            detail={lastAuto ? `Dernier contenu ${ago(lastAuto)}` : undefined}
            note="Génère les briefs, principes marketing et contenus." />
          <ConnCard icon={<Link2 size={17} />} name="Notion" status="off"
            note="Synchronisation gérée côté tâches programmées — pas encore de statut en direct ici." />
          <ConnCard icon={<Apple size={17} />} name="Apple Calendar" status={apple ? 'ok' : 'off'}
            detail={apple?.email} href="/calendrier" />
          <ConnCard icon={<Link2 size={17} />} name="Calendriers abonnés (iCal)" status={icsCount > 0 ? 'ok' : 'off'}
            detail={icsCount > 0 ? `${icsCount} flux` : undefined} href="/calendrier" />
          <ConnCard icon={<Activity size={17} />} name="Strava" status={strava ? 'ok' : 'off'} href="/sport" />
        </div>
      </section>

      {/* ── Tâches programmées ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ ...DF, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', flex: 1 }}>Tâches programmées</p>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-muted)' }}><RefreshCw size={11} /> Auto</span>
        </div>
        <div style={{ ...card() }}>
          <AutoRow icon={<Sparkles size={16} />} color="var(--accent-time)" name="Brief & débrief quotidiens"
            cadence="Chaque jour" output={latestBrief ? 'brief généré' : 'en attente'} when={lastAuto} href="/brief" />
          <AutoRow icon={<Award size={16} />} color="var(--accent-rapports)" name="Principes marketing"
            cadence="Chaque lundi" output={`${mktDone}/${totalMkt} traités${mktNext ? ` · suivant : ${mktNext.principle.slice(0, 28)}…` : ''}`}
            when={mktNext?.week_of ?? (principles.find(p => p.status === 'done')?.week_of) ?? null} href="/directeur-marketing" />
          <AutoRow icon={<CheckSquare size={16} />} color="var(--accent-sport)" name="Parcours de formation"
            cadence="Suivi continu" output={`${formDone}/${totalForm} jalons`}
            when={milestones.filter(m => m.done_at).sort((a, b) => (b.done_at! > a.done_at! ? 1 : -1))[0]?.done_at ?? null}
            href="/directeur-marketing" />
        </div>
        {(loadingDigests) && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chargement…</p>}
      </section>

      <p style={{ fontSize: 11, color: 'var(--text-subtle)', lineHeight: 1.6 }}>
        Le statut de Claude est déduit de la fraîcheur des contenus générés. Pour un état en direct de Claude et Notion,
        il faudra brancher leurs connecteurs (endpoint de statut) — dis-le si tu veux que je le mette en place.
      </p>
    </div>
  )
}
