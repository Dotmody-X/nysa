import type { z } from 'zod'
import type { AgentContext } from '../context.js'

/**
 * Descripteur de tool indépendant du transport. Aujourd'hui exposé via MCP à
 * Claude Code ; la même définition marcherait derrière une API HTTP ou un autre
 * client, sans toucher à la logique métier.
 *
 * `schema` est un ZodObject : le serveur MCP en consomme le `.shape`.
 */
export type ToolDef = {
  name: string
  description: string
  schema: z.ZodObject<z.ZodRawShape>
  /** Retourne du texte destiné au modèle — JSON compact quand c'est structuré. */
  run: (input: any, ctx: AgentContext) => Promise<string>
}

export function tool<S extends z.ZodObject<z.ZodRawShape>>(def: {
  name: string
  description: string
  schema: S
  run: (input: z.infer<S>, ctx: AgentContext) => Promise<string>
}): ToolDef {
  return def as unknown as ToolDef
}
