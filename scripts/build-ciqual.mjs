// Génère `lib/ciqual.generated.ts` à partir de la table CIQUAL 2020 (ANSES).
//
// Source open data (Licence Ouverte / Etalab) :
//   https://ciqual.anses.fr/cms/sites/default/files/inline-files/XML_2020_07_07.zip
//
// Utilisation :
//   1) Télécharger + dézipper l'archive XML dans un dossier (ex. ./ciqual-src)
//      curl -sL -o ciqual.zip "https://ciqual.anses.fr/cms/sites/default/files/inline-files/XML_2020_07_07.zip"
//      unzip ciqual.zip -d ciqual-src
//   2) node scripts/build-ciqual.mjs ./ciqual-src
//
// Régénère un instantané statique : aucune dépendance réseau à l'exécution de l'app.

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = process.argv[2] || './ciqual-src'
const OUT = 'lib/ciqual.generated.ts'

// Constituants CIQUAL retenus (pour 100 g)
const CONST = {
  kcal:   '328',   // Energie, Règlement UE N° 1169/2011 (kcal/100 g)
  prot:   '25000', // Protéines, N x facteur de Jones
  carbs:  '31000', // Glucides
  sugars: '32000', // Sucres
  fat:    '40000', // Lipides
  fiber:  '34100', // Fibres alimentaires
  salt:   '10004', // Sel chlorure de sodium
}

// Groupe CIQUAL (1er niveau) → rayon NYSA
const GRP_TO_CATEGORY = {
  '01': 'Épicerie',            // entrées et plats composés
  '02': 'Fruits & Légumes',    // fruits, légumes, légumineuses, oléagineux
  '03': 'Féculents',           // produits céréaliers
  '04': 'Viandes & Poissons',  // viandes, œufs, poissons
  '05': 'Produits frais',      // produits laitiers
  '06': 'Boissons',            // eaux et boissons
  '07': 'Épicerie',            // produits sucrés
  '08': 'Produits frais',      // glaces et sorbets
  '09': 'Épicerie',            // matières grasses
  '10': 'Épices & Herbes',     // aides culinaires et ingrédients divers
  '11': 'Bébé',                // aliments infantiles
}

const read = f => readFileSync(join(SRC, f), 'latin1') // CIQUAL = windows-1252 ≈ latin1

// Parse une « teneur » CIQUAL : "59,7" | "1 140" | "traces" | "-" | "< 0,5"
function teneur(raw) {
  if (raw == null) return null
  let s = String(raw).replace(/ /g, ' ').trim()
  if (!s || s === '-') return null
  if (/traces/i.test(s)) return 0
  s = s.replace(/[<>]/g, '').replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

// 1) Aliments : alim_code → { nom FR, rayon }
const alimXml = read('alim_2020_07_07.xml')
const names = new Map()
for (const m of alimXml.matchAll(/<ALIM>([\s\S]*?)<\/ALIM>/g)) {
  const b = m[1]
  const code = b.match(/<alim_code>\s*(\d+)\s*<\/alim_code>/)?.[1]
  const nom = b.match(/<alim_nom_fr>\s*([\s\S]*?)\s*<\/alim_nom_fr>/)?.[1]
  const grp = b.match(/<alim_grp_code>\s*(\d+)\s*<\/alim_grp_code>/)?.[1]
  if (code && nom) names.set(code, {
    nom: nom.replace(/\s+/g, ' ').trim(),
    cat: GRP_TO_CATEGORY[grp] || 'Épicerie',
  })
}

// 2) Composition : (alim_code, const_code) → teneur
const wanted = new Set(Object.values(CONST))
const byCode = Object.fromEntries(Object.values(CONST).map(c => [c, null])) // template
const foods = new Map() // alim_code → {kcal,prot,carbs,sugars,fat,fiber,salt}
const compoXml = read('compo_2020_07_07.xml')
for (const m of compoXml.matchAll(/<COMPO>([\s\S]*?)<\/COMPO>/g)) {
  const b = m[1]
  const cc = b.match(/<const_code>\s*(\d+)\s*<\/const_code>/)?.[1]
  if (!cc || !wanted.has(cc)) continue
  const ac = b.match(/<alim_code>\s*(\d+)\s*<\/alim_code>/)?.[1]
  if (!ac) continue
  const t = teneur(b.match(/<teneur>\s*([\s\S]*?)\s*<\/teneur>/)?.[1])
  if (t == null) continue
  if (!foods.has(ac)) foods.set(ac, { ...byCode })
  const key = Object.keys(CONST).find(k => CONST[k] === cc)
  foods.get(ac)[key] = t
}

// 3) Assemble : on garde les aliments ayant une valeur énergétique (kcal)
const rows = []
for (const [code, meta] of names) {
  const f = foods.get(code)
  if (!f || f.kcal == null) continue
  rows.push({
    name: meta.nom,
    cat: meta.cat,
    kcal: f.kcal ?? 0,
    prot: f.prot ?? 0,
    carbs: f.carbs ?? 0,
    sugars: f.sugars ?? 0,
    fat: f.fat ?? 0,
    fiber: f.fiber ?? 0,
    salt: f.salt ?? 0,
  })
}
rows.sort((a, b) => a.name.localeCompare(b.name, 'fr'))

const round = n => Math.round(n * 10) / 10
const lines = rows.map(r =>
  `  [${JSON.stringify(r.name)},${round(r.kcal)},${round(r.prot)},${round(r.carbs)},${round(r.sugars)},${round(r.fat)},${round(r.fiber)},${round(r.salt)},${JSON.stringify(r.cat)}],`
)

const out = `// ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : Table CIQUAL 2020 (ANSES) — Licence Ouverte / Etalab.
// Régénérer : node scripts/build-ciqual.mjs ./ciqual-src
// Colonnes : [nom, kcal, protéines, glucides, sucres, lipides, fibres, sel, rayon] pour 100 g.

export type CiqualRow = [string, number, number, number, number, number, number, number, string]

export const CIQUAL_ROWS: CiqualRow[] = [
${lines.join('\n')}
]
`

writeFileSync(OUT, out)
console.log(`✅ ${rows.length} aliments CIQUAL → ${OUT} (${(out.length / 1024).toFixed(0)} KB)`)
