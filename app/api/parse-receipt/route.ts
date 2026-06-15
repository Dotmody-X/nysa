// Extraction du TEXTE d'un PDF de ticket/facture (côté serveur, Node).
//   POST multipart { file } → { text } (texte avec sauts de ligne reconstitués)
// L'analyse en lignes d'articles se fait côté client (lib/receiptParse).

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

type TextItem = { str?: string; transform?: number[] }

export async function POST(request: Request) {
  let file: File | null = null
  try {
    const form = await request.formData()
    file = form.get('file') as File | null
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Fichier trop volumineux (max 8 Mo)' }, { status: 413 })

  try {
    const buf = new Uint8Array(await file.arrayBuffer())
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    // Pas de worker côté serveur (exécution sur le thread principal Node)
    try { (pdfjs as { GlobalWorkerOptions?: { workerSrc: string } }).GlobalWorkerOptions!.workerSrc = '' } catch { /* noop */ }

    const doc = await pdfjs.getDocument({ data: buf, isEvalSupported: false, useSystemFonts: true }).promise
    let text = ''
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const content = await page.getTextContent()
      // Regroupe les fragments par ligne (même Y, à 2 px près), triés par X
      const rows = new Map<number, { x: number; s: string }[]>()
      for (const it of content.items as TextItem[]) {
        const s = it.str ?? ''
        if (!s.trim() || !it.transform) continue
        const y = Math.round(it.transform[5] / 2) * 2
        if (!rows.has(y)) rows.set(y, [])
        rows.get(y)!.push({ x: it.transform[4], s })
      }
      const ys = [...rows.keys()].sort((a, b) => b - a) // haut → bas
      for (const y of ys) {
        const line = rows.get(y)!.sort((a, b) => a.x - b.x).map(r => r.s).join(' ').replace(/\s{2,}/g, ' ').trim()
        if (line) text += line + '\n'
      }
      text += '\n'
    }
    if (!text.trim()) return NextResponse.json({ error: 'PDF sans texte (probablement scanné en image)' }, { status: 422 })
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'Lecture du PDF impossible' }, { status: 422 })
  }
}
