/**
 * Catalogue local conséquent — aliments, épices/herbes, boissons,
 * hygiène et entretien/ménager. Sert d'autocomplétion à la saisie
 * (courses, inventaire, ingrédients) et auto-classe chaque article
 * dans son rayon. Complété à la demande par la recherche OpenFoodFacts.
 */

export type CatalogCategory =
  | 'Fruits & Légumes'
  | 'Viandes & Poissons'
  | 'Produits frais'
  | 'Épicerie'
  | 'Féculents'
  | 'Épices & Herbes'
  | 'Boissons'
  | 'Hygiène'
  | 'Entretien'
  | 'Bébé'
  | 'Animaux'

export interface CatalogItem {
  name: string
  category: CatalogCategory
  unit?: string
}

export const CATALOG_CATEGORIES: { name: CatalogCategory; emoji: string; color: string }[] = [
  { name: 'Fruits & Légumes',   emoji: '🥬', color: '#5B9F3A' },
  { name: 'Viandes & Poissons', emoji: '🍖', color: '#C45E3E' },
  { name: 'Produits frais',     emoji: '🧀', color: 'var(--accent-budget)' },
  { name: 'Épicerie',           emoji: '🥫', color: '#E8A838' },
  { name: 'Féculents',          emoji: '🍝', color: '#D9A24F' },
  { name: 'Épices & Herbes',    emoji: '🌶️', color: '#A85C3F' },
  { name: 'Boissons',           emoji: '🥤', color: '#3B82F6' },
  { name: 'Hygiène',            emoji: '🧴', color: '#A78BFA' },
  { name: 'Entretien',          emoji: '🧽', color: '#5E9C8F' },
  { name: 'Bébé',               emoji: '🍼', color: '#E9A8C2' },
  { name: 'Animaux',            emoji: '🐾', color: '#9B72CF' },
]

export const CATEGORY_EMOJI: Record<CatalogCategory, string> = Object.fromEntries(
  CATALOG_CATEGORIES.map(c => [c.name, c.emoji])
) as Record<CatalogCategory, string>

const C = (category: CatalogCategory, names: string[], unit?: string): CatalogItem[] =>
  names.map(name => ({ name, category, unit }))

export const CATALOG: CatalogItem[] = [
  // ── Fruits & Légumes ────────────────────────────────────────────
  ...C('Fruits & Légumes', [
    'Pomme', 'Banane', 'Orange', 'Clémentine', 'Citron', 'Citron vert', 'Pamplemousse',
    'Fraise', 'Framboise', 'Myrtille', 'Mûre', 'Raisin', 'Poire', 'Pêche', 'Nectarine',
    'Abricot', 'Prune', 'Cerise', 'Kiwi', 'Ananas', 'Mangue', 'Melon', 'Pastèque',
    'Figue', 'Grenade', 'Fruit de la passion', 'Avocat',
    'Tomate', 'Tomate cerise', 'Concombre', 'Courgette', 'Aubergine', 'Poivron',
    'Carotte', 'Pomme de terre', 'Patate douce', 'Oignon', 'Oignon rouge', 'Échalote',
    'Ail', 'Brocoli', 'Chou-fleur', 'Chou', 'Chou rouge', 'Chou de Bruxelles',
    'Épinard', 'Laitue', 'Roquette', 'Mâche', 'Endive', 'Champignon de Paris',
    'Haricot vert', 'Petit pois', 'Maïs', 'Betterave', 'Radis', 'Navet', 'Poireau',
    'Céleri', 'Fenouil', 'Potiron', 'Butternut', 'Asperge', 'Artichaut', 'Gingembre frais',
    'Persil', 'Coriandre fraîche', 'Basilic frais', 'Menthe fraîche', 'Ciboulette',
  ]),

  // ── Viandes & Poissons ──────────────────────────────────────────
  ...C('Viandes & Poissons', [
    'Blanc de poulet', 'Cuisse de poulet', 'Poulet entier', 'Escalope de dinde',
    'Bœuf haché', 'Steak', 'Rôti de bœuf', 'Bavette', 'Porc', 'Côte de porc', 'Filet mignon',
    'Lardons', 'Jambon blanc', 'Jambon cru', 'Saucisse', 'Merguez', 'Chipolata', 'Bacon',
    'Agneau', 'Veau', 'Canard', 'Saumon', 'Pavé de saumon', 'Thon', 'Cabillaud', 'Colin',
    'Truite', 'Dorade', 'Crevette', 'Moule', 'Sardine', 'Maquereau', 'Poisson pané',
    'Surimi', 'Œufs',
  ]),

  // ── Produits frais (crèmerie) ───────────────────────────────────
  ...C('Produits frais', [
    'Lait', 'Lait demi-écrémé', 'Lait entier', 'Crème fraîche', 'Crème liquide', 'Beurre',
    'Beurre doux', 'Margarine', 'Yaourt nature', 'Yaourt grec', 'Yaourt aux fruits',
    'Fromage blanc', 'Skyr', 'Petit-suisse', 'Mozzarella', 'Parmesan', 'Emmental râpé',
    'Comté', 'Cheddar', 'Feta', 'Bûche de chèvre', 'Camembert', 'Brie', 'Raclette',
    'Mascarpone', 'Ricotta', 'Crème dessert', 'Tofu', 'Tofu fumé',
  ]),

  // ── Épicerie (placard) ──────────────────────────────────────────
  ...C('Épicerie', [
    'Farine', 'Maïzena', 'Sucre', 'Sucre roux', 'Sucre glace', 'Huile d\'olive',
    'Huile de tournesol', 'Huile de colza', 'Vinaigre', 'Vinaigre balsamique',
    'Moutarde', 'Ketchup', 'Mayonnaise', 'Sauce soja', 'Sauce tomate', 'Concentré de tomate',
    'Tomates concassées', 'Miel', 'Sirop d\'érable', 'Confiture', 'Pâte à tartiner',
    'Beurre de cacahuète', 'Thon en boîte', 'Sardines en boîte', 'Maïs en boîte',
    'Haricots rouges', 'Pois chiches', 'Lentilles', 'Lentilles corail', 'Haricots blancs',
    'Bouillon cube', 'Levure chimique', 'Levure boulangère', 'Bicarbonate',
    'Chocolat noir', 'Chocolat au lait', 'Pépites de chocolat', 'Cacao en poudre',
    'Biscuits', 'Céréales', 'Muesli', 'Granola', 'Chips', 'Compote', 'Lait de coco',
    'Olives', 'Cornichons', 'Câpres', 'Pesto', 'Tahini', 'Noix', 'Amandes', 'Noisettes',
    'Cacahuètes', 'Raisins secs', 'Pruneaux',
  ]),

  // ── Féculents / Céréales ────────────────────────────────────────
  ...C('Féculents', [
    'Riz', 'Riz basmati', 'Riz complet', 'Pâtes', 'Spaghetti', 'Penne', 'Tagliatelles',
    'Macaroni', 'Lasagnes', 'Nouilles', 'Nouilles chinoises', 'Quinoa', 'Boulgour',
    'Semoule', 'Couscous', 'Polenta', 'Flocons d\'avoine', 'Gnocchi', 'Pain', 'Baguette',
    'Pain de mie', 'Pain complet', 'Pain burger', 'Wraps', 'Tortillas', 'Pâte feuilletée',
    'Pâte brisée', 'Pâte à pizza',
  ]),

  // ── Épices & Herbes ─────────────────────────────────────────────
  ...C('Épices & Herbes', [
    'Sel fin', 'Gros sel', 'Fleur de sel', 'Poivre noir', 'Poivre blanc', 'Paprika',
    'Paprika fumé', 'Piment', 'Piment de Cayenne', 'Piment d\'Espelette', 'Cumin',
    'Coriandre moulue', 'Curry', 'Curcuma', 'Gingembre moulu', 'Cannelle', 'Muscade',
    'Clou de girofle', 'Cardamome', 'Anis étoilé', 'Vanille', 'Safran', 'Fenugrec',
    'Sumac', 'Za\'atar', 'Quatre-épices', 'Garam masala', 'Ras el hanout', 'Colombo',
    'Herbes de Provence', 'Origan', 'Thym', 'Romarin', 'Laurier', 'Basilic séché',
    'Persil séché', 'Ciboulette séchée', 'Aneth', 'Estragon', 'Sauge', 'Ail en poudre',
    'Oignon en poudre', 'Graines de sésame', 'Graines de chia', 'Graines de lin',
    'Graines de courge', 'Graines de tournesol',
  ]),

  // ── Boissons ────────────────────────────────────────────────────
  ...C('Boissons', [
    'Eau', 'Eau pétillante', 'Eau gazeuse', 'Jus d\'orange', 'Jus de pomme',
    'Jus multifruits', 'Jus de raisin', 'Café', 'Café moulu', 'Café en grains', 'Capsules café',
    'Thé', 'Thé vert', 'Infusion', 'Chocolat en poudre', 'Lait d\'amande', 'Lait d\'avoine',
    'Lait de soja', 'Lait de coco (boisson)', 'Soda', 'Cola', 'Limonade', 'Tonic',
    'Sirop', 'Eau de coco', 'Smoothie', 'Bière', 'Vin rouge', 'Vin blanc', 'Vin rosé',
    'Champagne', 'Cidre',
  ]),

  // ── Hygiène ─────────────────────────────────────────────────────
  ...C('Hygiène', [
    'Papier toilette', 'Mouchoirs', 'Savon', 'Savon liquide', 'Gel douche', 'Shampoing',
    'Après-shampoing', 'Dentifrice', 'Brosse à dents', 'Bain de bouche', 'Fil dentaire',
    'Déodorant', 'Coton-tiges', 'Cotons', 'Disques démaquillants', 'Rasoir', 'Lames de rasoir',
    'Mousse à raser', 'Crème hydratante', 'Crème solaire', 'Baume à lèvres',
    'Serviettes hygiéniques', 'Tampons', 'Protège-slips', 'Gel hydroalcoolique',
    'Lingettes', 'Coupe-ongles', 'Pansements',
  ]),

  // ── Entretien / Ménager ─────────────────────────────────────────
  ...C('Entretien', [
    'Liquide vaisselle', 'Pastilles lave-vaisselle', 'Sel régénérant', 'Liquide de rinçage',
    'Lessive', 'Lessive liquide', 'Adoucissant', 'Détachant', 'Éponges', 'Grattoir',
    'Chiffons', 'Microfibre', 'Essuie-tout', 'Sacs poubelle', 'Sacs congélation',
    'Film alimentaire', 'Papier aluminium', 'Papier cuisson', 'Nettoyant multi-usage',
    'Nettoyant sol', 'Nettoyant vitres', 'Désinfectant WC', 'Bloc WC', 'Javel',
    'Vinaigre blanc', 'Bicarbonate (ménager)', 'Anti-calcaire', 'Désodorisant',
    'Allumettes', 'Bougies', 'Ampoules', 'Piles', 'Recharge briquet',
  ]),

  // ── Bébé ────────────────────────────────────────────────────────
  ...C('Bébé', [
    'Couches', 'Lingettes bébé', 'Lait infantile', 'Petits pots', 'Céréales bébé',
    'Liniment', 'Coton bébé', 'Crème change', 'Sérum physiologique',
  ]),

  // ── Animaux ─────────────────────────────────────────────────────
  ...C('Animaux', [
    'Croquettes chien', 'Croquettes chat', 'Pâtée chien', 'Pâtée chat', 'Litière',
    'Friandises animaux', 'Sacs à déjections',
  ]),
]

// Normalisation pour une recherche tolérante (accents/casse)
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Recherche dans le catalogue local (max `limit` résultats). */
export function searchCatalog(query: string, limit = 8): CatalogItem[] {
  const q = norm(query.trim())
  if (!q) return []
  const starts: CatalogItem[] = []
  const contains: CatalogItem[] = []
  for (const item of CATALOG) {
    const n = norm(item.name)
    if (n.startsWith(q)) starts.push(item)
    else if (n.includes(q)) contains.push(item)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

/** Devine la catégorie d'un nom libre via le catalogue (sinon undefined). */
export function guessCategory(name: string): CatalogCategory | undefined {
  const n = norm(name.trim())
  if (!n) return undefined
  const exact = CATALOG.find(i => norm(i.name) === n)
  if (exact) return exact.category
  const partial = CATALOG.find(i => norm(i.name).includes(n) || n.includes(norm(i.name)))
  return partial?.category
}

// ── Nutrition pour 100 g (valeurs indicatives) ──────────────────
// kcal, protéines, glucides, lipides. Permet l'auto-remplissage des
// macros d'un ingrédient à la sélection (sinon OpenFoodFacts).
export type Macros = { kcal: number; prot: number; carbs: number; fat: number }

const m = (kcal: number, prot: number, carbs: number, fat: number): Macros => ({ kcal, prot, carbs, fat })

export const NUTRITION_PER_100G: Record<string, Macros> = {
  // Fruits & Légumes
  'Pomme': m(52,0.3,14,0.2), 'Banane': m(89,1.1,23,0.3), 'Orange': m(47,0.9,12,0.1),
  'Citron': m(29,1.1,9,0.3), 'Fraise': m(33,0.7,8,0.3), 'Framboise': m(52,1.2,12,0.7),
  'Myrtille': m(57,0.7,14,0.3), 'Raisin': m(69,0.7,18,0.2), 'Poire': m(57,0.4,15,0.1),
  'Pêche': m(39,0.9,10,0.3), 'Abricot': m(48,1.4,11,0.4), 'Kiwi': m(61,1.1,15,0.5),
  'Ananas': m(50,0.5,13,0.1), 'Mangue': m(60,0.8,15,0.4), 'Melon': m(34,0.8,8,0.2),
  'Pastèque': m(30,0.6,8,0.2), 'Avocat': m(160,2,9,15), 'Tomate': m(18,0.9,3.9,0.2),
  'Tomate cerise': m(18,0.9,3.9,0.2), 'Concombre': m(15,0.7,3.6,0.1), 'Courgette': m(17,1.2,3.1,0.3),
  'Aubergine': m(25,1,6,0.2), 'Poivron': m(31,1,6,0.3), 'Carotte': m(41,0.9,10,0.2),
  'Pomme de terre': m(77,2,17,0.1), 'Patate douce': m(86,1.6,20,0.1), 'Oignon': m(40,1.1,9,0.1),
  'Échalote': m(72,2.5,17,0.1), 'Ail': m(149,6.4,33,0.5), 'Brocoli': m(34,2.8,7,0.4),
  'Chou-fleur': m(25,1.9,5,0.3), 'Épinard': m(23,2.9,3.6,0.4), 'Laitue': m(15,1.4,2.9,0.2),
  'Roquette': m(25,2.6,3.7,0.7), 'Champignon de Paris': m(22,3.1,3.3,0.3), 'Haricot vert': m(31,1.8,7,0.2),
  'Petit pois': m(81,5,14,0.4), 'Maïs': m(86,3.2,19,1.2), 'Betterave': m(43,1.6,10,0.2),
  'Poireau': m(61,1.5,14,0.3), 'Céleri': m(16,0.7,3,0.2), 'Potiron': m(26,1,6.5,0.1),
  'Gingembre frais': m(80,1.8,18,0.8),
  // Viandes & Poissons
  'Blanc de poulet': m(165,31,0,3.6), 'Cuisse de poulet': m(209,26,0,11), 'Poulet entier': m(215,25,0,13),
  'Escalope de dinde': m(135,29,0,1), 'Bœuf haché': m(250,26,0,15), 'Steak': m(217,26,0,12),
  'Rôti de bœuf': m(217,26,0,12), 'Porc': m(242,27,0,14), 'Côte de porc': m(242,27,0,14),
  'Lardons': m(350,15,1,32), 'Jambon blanc': m(145,18,1,7), 'Jambon cru': m(241,26,1,14),
  'Saucisse': m(300,12,2,27), 'Merguez': m(310,15,1,27), 'Bacon': m(541,37,1.4,42),
  'Agneau': m(294,25,0,21), 'Veau': m(172,24,0,8), 'Canard': m(337,19,0,28),
  'Saumon': m(208,20,0,13), 'Pavé de saumon': m(208,20,0,13), 'Thon': m(132,28,0,1),
  'Cabillaud': m(82,18,0,0.7), 'Colin': m(82,18,0,0.7), 'Truite': m(141,20,0,6),
  'Crevette': m(99,24,0.2,0.3), 'Sardine': m(208,25,0,11), 'Maquereau': m(205,19,0,14),
  'Œufs': m(155,13,1.1,11),
  // Produits frais
  'Lait': m(64,3.4,4.8,3.6), 'Lait demi-écrémé': m(47,3.4,4.8,1.6), 'Lait entier': m(64,3.4,4.8,3.6),
  'Crème fraîche': m(290,2.4,3,30), 'Crème liquide': m(290,2.4,3,30), 'Beurre': m(717,0.9,0.1,81),
  'Margarine': m(717,0.2,0.7,80), 'Yaourt nature': m(61,3.5,4.7,3.3), 'Yaourt grec': m(97,9,4,5),
  'Fromage blanc': m(75,8,4,3), 'Skyr': m(63,11,4,0.2), 'Mozzarella': m(280,22,2.2,17),
  'Parmesan': m(392,36,3.2,26), 'Emmental râpé': m(380,28,0.5,29), 'Comté': m(410,27,0,33),
  'Cheddar': m(402,25,1.3,33), 'Feta': m(264,14,4,21), 'Bûche de chèvre': m(290,19,2,23),
  'Camembert': m(300,20,0.5,24), 'Brie': m(334,21,0.5,28), 'Mascarpone': m(429,4.6,4,44),
  'Ricotta': m(174,11,3,13), 'Tofu': m(76,8,1.9,4.8),
  // Épicerie
  'Farine': m(364,10,76,1), 'Maïzena': m(381,0.3,91,0.1), 'Sucre': m(400,0,100,0),
  'Sucre roux': m(380,0,98,0), 'Huile d\'olive': m(884,0,0,100), 'Huile de tournesol': m(884,0,0,100),
  'Huile de colza': m(884,0,0,100), 'Moutarde': m(66,4,5,3), 'Ketchup': m(112,1.3,26,0.1),
  'Mayonnaise': m(680,1,2,75), 'Sauce soja': m(53,8,5,0.6), 'Sauce tomate': m(35,1.4,5,1.2),
  'Concentré de tomate': m(82,4.3,19,0.5), 'Tomates concassées': m(32,1.6,5,0.3), 'Miel': m(304,0.3,82,0),
  'Sirop d\'érable': m(260,0,67,0.1), 'Confiture': m(250,0.4,65,0.1), 'Pâte à tartiner': m(539,6,57,31),
  'Beurre de cacahuète': m(588,25,20,50), 'Thon en boîte': m(116,26,0,1), 'Maïs en boîte': m(86,3.2,19,1.2),
  'Haricots rouges': m(333,24,60,0.8), 'Pois chiches': m(364,19,61,6), 'Lentilles': m(352,25,63,1),
  'Lentilles corail': m(358,24,63,1.6), 'Bouillon cube': m(200,10,20,10), 'Chocolat noir': m(546,5,61,31),
  'Chocolat au lait': m(535,7.6,59,30), 'Pépites de chocolat': m(502,4.2,64,25), 'Cacao en poudre': m(228,20,58,14),
  'Biscuits': m(480,6,65,21), 'Céréales': m(379,7,84,3), 'Muesli': m(363,9,66,6), 'Granola': m(471,10,64,20),
  'Chips': m(536,7,53,34), 'Compote': m(45,0.2,11,0.1), 'Lait de coco': m(230,2.3,3,24),
  'Olives': m(115,0.8,6,11), 'Pesto': m(450,5,6,45), 'Noix': m(654,15,14,65), 'Amandes': m(579,21,22,50),
  'Noisettes': m(628,15,17,61), 'Cacahuètes': m(567,26,16,49), 'Raisins secs': m(299,3,79,0.5),
  // Féculents
  'Riz': m(360,7,80,0.6), 'Riz basmati': m(360,7,79,0.9), 'Riz complet': m(362,7.5,76,2.7),
  'Pâtes': m(371,13,75,1.5), 'Spaghetti': m(371,13,75,1.5), 'Penne': m(371,13,75,1.5),
  'Tagliatelles': m(371,13,75,1.5), 'Nouilles': m(384,14,72,4), 'Quinoa': m(368,14,64,6),
  'Boulgour': m(342,12,76,1.3), 'Semoule': m(360,12,73,1), 'Couscous': m(376,13,77,0.6),
  'Polenta': m(362,8,79,1.6), 'Flocons d\'avoine': m(389,17,66,7), 'Pain': m(265,9,49,3.2),
  'Baguette': m(274,9,55,1.3), 'Pain de mie': m(265,8,49,4), 'Pain complet': m(247,13,41,4),
  'Wraps': m(310,8,52,7), 'Tortillas': m(310,8,52,7),
  // Boissons
  'Jus d\'orange': m(45,0.7,10,0.2), 'Jus de pomme': m(46,0.1,11,0.1), 'Cola': m(42,0,11,0),
  'Limonade': m(40,0,10,0), 'Bière': m(43,0.5,3.6,0), 'Vin rouge': m(85,0.1,2.6,0),
  'Vin blanc': m(82,0.1,2.6,0), 'Lait d\'amande': m(24,1,3,1.1), 'Lait d\'avoine': m(47,1,7,1.5),
  'Lait de soja': m(33,3.3,1.8,1.8), 'Eau': m(0,0,0,0), 'Eau pétillante': m(0,0,0,0),
}

/** Macros pour 100 g d'un aliment (accent/casse-insensible). null si inconnu. */
export function catalogNutrition(name: string): Macros | null {
  const n = norm(name.trim())
  if (!n) return null
  for (const [k, v] of Object.entries(NUTRITION_PER_100G)) {
    if (norm(k) === n) return v
  }
  for (const [k, v] of Object.entries(NUTRITION_PER_100G)) {
    if (norm(k).includes(n) || n.includes(norm(k))) return v
  }
  return null
}

// ── Poids moyen d'une pièce (en grammes) ────────────────────────
// Pour convertir une quantité en « pièce/unité » (pc) en grammes lors du
// calcul nutritionnel. Ex. 2 œufs = 2 × 50 g = 100 g → ~155 kcal/100 g ≈ 155 kcal.
export const PIECE_GRAMS: Record<string, number> = {
  'Œufs': 50,
  'Pomme': 180, 'Banane': 120, 'Orange': 130, 'Clémentine': 70, 'Citron': 100,
  'Citron vert': 70, 'Pamplemousse': 230, 'Poire': 170, 'Pêche': 150, 'Nectarine': 140,
  'Abricot': 40, 'Prune': 60, 'Kiwi': 75, 'Mangue': 200, 'Avocat': 170,
  'Tomate': 120, 'Tomate cerise': 15, 'Concombre': 300, 'Courgette': 200, 'Aubergine': 250,
  'Poivron': 150, 'Carotte': 70, 'Pomme de terre': 150, 'Patate douce': 150, 'Oignon': 110,
  'Oignon rouge': 110, 'Échalote': 30, 'Ail': 5, 'Brocoli': 300, 'Chou-fleur': 600,
  'Champignon de Paris': 15, 'Betterave': 120, 'Radis': 10, 'Navet': 120, 'Poireau': 150,
  'Céleri': 60, 'Fenouil': 250, 'Gingembre frais': 30,
  'Blanc de poulet': 150, 'Cuisse de poulet': 130, 'Escalope de dinde': 120,
  'Steak': 150, 'Côte de porc': 150, 'Saucisse': 70, 'Merguez': 60, 'Chipolata': 50,
  'Pavé de saumon': 150, 'Crevette': 10, 'Sardine': 25, 'Maquereau': 150,
  'Jambon blanc': 40, 'Jambon cru': 30, 'Bacon': 15,
  'Yaourt nature': 125, 'Yaourt grec': 150, 'Yaourt aux fruits': 125, 'Petit-suisse': 60,
  'Mozzarella': 125, 'Camembert': 250, 'Tofu': 200,
  'Pain': 250, 'Baguette': 250, 'Pain de mie': 30, 'Pain complet': 250, 'Pain burger': 60,
  'Wraps': 60, 'Tortillas': 60, 'Pâte feuilletée': 230, 'Pâte brisée': 230, 'Pâte à pizza': 260,
  'Biscuits': 10, 'Gnocchi': 300,
}

/** Poids d'une pièce (g) pour un aliment ; défaut 100 g si inconnu. */
export function catalogPieceGrams(name: string): number {
  const n = norm(name.trim())
  if (!n) return 100
  for (const [k, v] of Object.entries(PIECE_GRAMS)) {
    if (norm(k) === n) return v
  }
  for (const [k, v] of Object.entries(PIECE_GRAMS)) {
    if (norm(k).includes(n) || n.includes(norm(k))) return v
  }
  return 100
}

/** Unité par défaut suggérée : « pc » si l'aliment se compte à la pièce, sinon « g ». */
export function defaultUnitFor(name: string): 'pc' | 'g' {
  const n = norm(name.trim())
  if (!n) return 'g'
  for (const k of Object.keys(PIECE_GRAMS)) {
    if (norm(k) === n) return 'pc'
  }
  for (const k of Object.keys(PIECE_GRAMS)) {
    if (norm(k).includes(n) || n.includes(norm(k))) return 'pc'
  }
  return 'g'
}
