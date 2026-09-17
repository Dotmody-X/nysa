import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { z } from 'zod'
import { tool } from './types.js'
import { audit } from '../audit.js'

/**
 * Les commandes d'étiquettes et leurs pièces — `public.etiquette_commandes`,
 * `public.etiquette_documents`, bucket `etiquettes`.
 *
 * Le cas d'usage qui a fait naître ces tools : Nathan envoie un BL en pièce
 * jointe dans Discord en disant « rajoute-le à la dernière commande ». Avant,
 * l'agent ne voyait pas le fichier et n'aurait rien pu en faire de toute façon.
 *
 * Le chemin dans le bucket suit exactement la convention de l'application web
 * (`hooks/useEtiquettes.ts`, `televerser`) : `<user>/<commande>/<horodatage>-<nom>`.
 * La policy du bucket exige que le premier segment soit l'identifiant de
 * l'utilisateur — le JWT porté par `ctx.db` fait le reste.
 */

const BUCKET = 'etiquettes'
const CATEGORIES = ['bl', 'bat', 'devis', 'facture', 'autre'] as const

/** Un numéro lisible depuis le nom de fichier, si Nathan ne l'a pas donné. */
function numeroDepuisNom(nom: string): string | null {
  const m = nom.match(/(\d{5,8})/)
  return m ? m[1]! : null
}

export const etiquetteTools = [
  tool({
    name: 'commandes_etiquettes',
    description:
      "Les dernières commandes d'étiquettes (référence, date, statut, nombre de pièces). " +
      'À appeler pour résoudre « la dernière commande » ou vérifier qu\'une référence existe ' +
      "avant d'y joindre un document.",
    schema: z.object({
      limite: z.number().int().min(1).max(20).default(5),
      reference: z.string().optional().describe('Filtre exact, ex. ET-31-08-2026 ou CMD-33685.'),
    }),
    run: async (input, ctx) => {
      let query = ctx.db
        .from('etiquette_commandes')
        .select('id, reference, date_commande, statut, imprimeur, etiquette_documents(categorie, numero)')
      if (input.reference) query = query.eq('reference', input.reference)
      const { data, error } = await query.order('date_commande', { ascending: false }).limit(input.limite)
      if (error) return `Erreur : ${error.message}`
      if (!data?.length) return 'Aucune commande.'
      return JSON.stringify(
        data.map(c => ({
          reference: c.reference,
          date: c.date_commande,
          statut: c.statut,
          pieces: (c.etiquette_documents as { categorie: string; numero: string | null }[]).map(
            d => `${d.categorie} ${d.numero ?? '?'}`,
          ),
        })),
      )
    },
  }),

  tool({
    name: 'joindre_document_etiquette',
    description:
      "Rattache un fichier (PDF le plus souvent) à une commande d'étiquettes : BL, BAT, devis " +
      'ou facture. Le fichier doit déjà être sur le disque — typiquement une pièce jointe ' +
      'Discord, dont le chemin figure dans le message. Lis le PDF avant si le numéro ou la ' +
      "date manquent : ils y sont presque toujours.",
    schema: z.object({
      reference: z.string().min(3).describe('Référence de la commande, ex. ET-31-08-2026.'),
      categorie: z.enum(CATEGORIES),
      chemin: z.string().min(1).describe('Chemin local du fichier à joindre.'),
      numero: z.string().optional().describe('Numéro du document (BL 40455, facture 2609012…).'),
      date_document: z.string().optional().describe('AAAA-MM-JJ, si lisible sur le document.'),
      montant: z.number().optional().describe('Montant HT, pour un devis ou une facture.'),
      notes: z.string().optional(),
    }),
    run: async (input, ctx) => {
      const { data: commande, error: e1 } = await ctx.db
        .from('etiquette_commandes')
        .select('id, reference')
        .eq('reference', input.reference)
        .maybeSingle()
      if (e1) return `Erreur : ${e1.message}`
      if (!commande) return `Aucune commande « ${input.reference} ». Appelle commandes_etiquettes pour voir les références existantes.`

      let contenu: Buffer
      try {
        contenu = await readFile(input.chemin)
      } catch {
        return `Fichier introuvable : ${input.chemin}. Les pièces jointes ne restent sur le disque que le temps de la conversation.`
      }

      const nom = basename(input.chemin)
      const propre = nom.replace(/[^\w.\-]/g, '_')
      const chemin = `${ctx.userId}/${commande.id}/${Date.now()}-${propre}`
      const type = nom.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'

      const envoi = await ctx.db.storage.from(BUCKET).upload(chemin, contenu, { contentType: type })
      if (envoi.error) {
        await audit(ctx, { tool: 'joindre_document_etiquette', args: input, ok: false, error: envoi.error.message })
        return `Téléversement refusé : ${envoi.error.message}`
      }

      const ligne = {
        user_id: ctx.userId,
        commande_id: commande.id,
        categorie: input.categorie,
        numero: input.numero?.trim() || numeroDepuisNom(nom),
        date_document: input.date_document || null,
        montant: input.montant ?? null,
        notes: input.notes?.trim() || null,
        filename: nom,
        file_path: chemin,
        file_size: contenu.byteLength,
        file_type: type,
      }
      const { data, error } = await ctx.db.from('etiquette_documents').insert(ligne).select('id, numero').single()
      if (error) {
        // Pas d'objet orphelin dans le bucket si la ligne n'a pas pu être écrite.
        await ctx.db.storage.from(BUCKET).remove([chemin])
        await audit(ctx, { tool: 'joindre_document_etiquette', args: input, ok: false, error: error.message })
        return `Erreur : ${error.message}`
      }

      await audit(ctx, { tool: 'joindre_document_etiquette', args: { ...input, chemin: nom }, after: data })
      return `${input.categorie.toUpperCase()} ${data.numero ?? ''} joint à ${commande.reference} (${Math.round(contenu.byteLength / 1024)} ko).`
    },
  }),
]
