import type { SupabaseClient } from '@supabase/supabase-js'
import type { Brand } from './brands.js'

/**
 * Contexte d'une requête : qui parle, depuis quel salon, avec quel client
 * Supabase. Il est passé à chaque tool — c'est ce qui garantit qu'un tool ne
 * peut agir que sur le compte de l'appelant.
 */
export type AgentContext = {
  userId: string
  db: SupabaseClient
  surface: 'discord'
  channelName: string | null
  brand: Brand | null
  timezone: string
}
