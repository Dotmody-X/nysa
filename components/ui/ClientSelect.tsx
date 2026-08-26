'use client'
import { useClients } from '@/hooks/useClients'

/**
 * Sélecteur de client, partagé par les tâches, les projets et le time tracker.
 *
 * Les clients archivés ne sont pas proposés — sauf si c'est celui déjà
 * rattaché : une valeur existante ne doit jamais disparaître d'une liste, sinon
 * ouvrir un formulaire suffirait à effacer silencieusement le rattachement.
 */
export function ClientSelect({
  value, onChange, style, placeholder = '— aucun client —',
}: {
  value?: string
  onChange: (clientId: string | undefined) => void
  style?: React.CSSProperties
  placeholder?: string
}) {
  const { clients, loading } = useClients()

  const proposés = clients.filter(c => c.statut !== 'archive' || c.id === value)

  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || undefined)}
      disabled={loading}
      style={style}
    >
      <option value="">{loading ? 'Chargement…' : placeholder}</option>
      {proposés.map(c => (
        <option key={c.id} value={c.id}>
          {c.name}{c.ville ? ` · ${c.ville}` : ''}
        </option>
      ))}
    </select>
  )
}
