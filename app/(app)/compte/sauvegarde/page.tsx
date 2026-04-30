'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Upload, Check, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DF: React.CSSProperties = { fontFamily: 'var(--font-display)' }
const TEAL = '#0E9594', ORANGE = '#F2542D', WHEAT = '#F5DFBB'

type ExportStatus = 'idle' | 'loading' | 'done' | 'error'

export default function SauvegardePage() {
  const router = useRouter()
  const [jsonStatus,  setJsonStatus]  = useState<ExportStatus>('idle')
  const [csvStatus,   setCsvStatus]   = useState<ExportStatus>('idle')
  const [importMsg,   setImportMsg]   = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function exportJSON() {
    setJsonStatus('loading')
    try {
      const supabase = createClient()
      const [tasks, entries, txs, runs, health] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('time_entries').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('running_activities').select('*'),
        supabase.from('health_metrics').select('*'),
      ])
      const blob = new Blob([JSON.stringify({
        exportedAt: new Date().toISOString(),
        version: '1.0',
        tasks: tasks.data,
        time_entries: entries.data,
        transactions: txs.data,
        running: runs.data,
        health: health.data,
      }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `nysa-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click(); URL.revokeObjectURL(url)
      setJsonStatus('done')
      setTimeout(() => setJsonStatus('idle'), 3000)
    } catch {
      setJsonStatus('error')
      setTimeout(() => setJsonStatus('idle'), 3000)
    }
  }

  async function exportCSV() {
    setCsvStatus('loading')
    try {
      const supabase = createClient()
      const { data: entries } = await supabase.from('time_entries').select('*, projects(name)').order('started_at', { ascending: false })
      if (!entries) { setCsvStatus('error'); return }
      const rows = [
        ['Date','Projet','Description','Catégorie','Durée (min)','Facturable','Début','Fin'],
        ...(entries as Array<Record<string, unknown> & { projects?: { name: string } }>).map(e => [
          String(e.started_at ?? '').slice(0,10),
          String((e.projects as { name?: string })?.name ?? ''),
          String(e.description ?? ''),
          String(e.category ?? ''),
          String(Math.round(Number(e.duration_seconds ?? 0) / 60)),
          e.is_billable ? 'Oui' : 'Non',
          String(e.started_at ?? ''),
          String(e.ended_at ?? ''),
        ]),
      ]
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `nysa-time-entries-${new Date().toISOString().slice(0,10)}.csv`
      a.click(); URL.revokeObjectURL(url)
      setCsvStatus('done')
      setTimeout(() => setCsvStatus('idle'), 3000)
    } catch {
      setCsvStatus('error')
      setTimeout(() => setCsvStatus('idle'), 3000)
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string)
        if (!json.version) { setImportMsg('❌ Format non reconnu — fichier invalide'); return }
        // Dry run: just validate structure
        const keys = ['tasks','time_entries','transactions','running','health']
        const found = keys.filter(k => Array.isArray(json[k]))
        setImportMsg(`✅ Fichier valide — ${found.join(', ')} détectés (${found.length}/5 tables). Importation désactivée en preview.`)
      } catch {
        setImportMsg('❌ Erreur de lecture du fichier JSON')
      }
    }
    reader.readAsText(file)
  }

  const btnStyle = (status: ExportStatus, color: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', background: status === 'done' ? TEAL : status === 'error' ? ORANGE : color,
    color: '#fff', borderRadius: 8, padding: '10px 0', ...DF, fontWeight: 700, fontSize: 12,
    border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer', opacity: status === 'loading' ? 0.7 : 1,
  })

  return (
    <div style={{ padding: '28px 32px', maxWidth: 600, margin: '0 auto' }}>

      <button onClick={() => router.push('/compte')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, marginBottom: 24, padding: 0 }}>
        <ArrowLeft size={13} /> Retour au profil
      </button>

      <h1 style={{ ...DF, fontWeight: 900, fontSize: 36, color: WHEAT, letterSpacing: '-0.02em', marginBottom: 4 }}>SAUVEGARDE.</h1>
      <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 28 }}>Exporter et importer vos données</p>

      {/* Export JSON */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(14,149,148,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Download size={16} style={{ color: TEAL }} />
          </div>
          <div>
            <p style={{ ...DF, fontSize: 12, fontWeight: 700, color: WHEAT }}>Export JSON complet</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Toutes vos données — tâches, sessions, budget, santé, running</p>
          </div>
        </div>
        <button onClick={exportJSON} disabled={jsonStatus === 'loading'} style={btnStyle(jsonStatus, TEAL)}>
          {jsonStatus === 'loading' ? 'Préparation…' : jsonStatus === 'done' ? <><Check size={13} /> Téléchargé !</> : jsonStatus === 'error' ? '❌ Erreur' : <><Download size={13} /> Télécharger le backup JSON</>}
        </button>
      </div>

      {/* Export CSV */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(242,84,45,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Download size={16} style={{ color: ORANGE }} />
          </div>
          <div>
            <p style={{ ...DF, fontSize: 12, fontWeight: 700, color: WHEAT }}>Export CSV — Time Tracker</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Toutes vos sessions de travail au format tableur</p>
          </div>
        </div>
        <button onClick={exportCSV} disabled={csvStatus === 'loading'} style={btnStyle(csvStatus, ORANGE)}>
          {csvStatus === 'loading' ? 'Préparation…' : csvStatus === 'done' ? <><Check size={13} /> Téléchargé !</> : csvStatus === 'error' ? '❌ Erreur' : <><Download size={13} /> Télécharger CSV sessions</>}
        </button>
      </div>

      {/* Import */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,223,187,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={16} style={{ color: WHEAT }} />
          </div>
          <div>
            <p style={{ ...DF, fontSize: 12, fontWeight: 700, color: WHEAT }}>Importer un backup</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Fichier JSON généré par NYSA</p>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(242,84,45,0.06)', border: '1px solid rgba(242,84,45,0.15)', display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
          <AlertTriangle size={13} style={{ color: ORANGE, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>L'importation remplace les données existantes. Assurez-vous d'avoir fait un export avant d'importer.</p>
        </div>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: 'var(--bg-input)', color: 'var(--wheat)', borderRadius: 8, padding: '10px 0', ...DF, fontWeight: 700, fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
          <Upload size={13} /> Sélectionner un fichier JSON
        </button>
        {importMsg && (
          <p style={{ fontSize: 11, color: importMsg.startsWith('✅') ? TEAL : ORANGE, marginTop: 10, lineHeight: 1.5 }}>{importMsg}</p>
        )}
      </div>
    </div>
  )
}
