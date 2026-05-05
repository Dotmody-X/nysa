/**
 * Belgian & French supermarket chain definitions.
 * Includes brand colors, OSM brand tag, and department ordering
 * (each chain has a specific store layout that is consistent across branches).
 */

export interface StoreChain {
  id: string
  name: string
  color: string
  textColor: string
  osmBrand: string          // OpenStreetMap brand= tag value
  logo: string              // emoji placeholder
  country: string[]
  departments: string[]     // Ordered list of departments as found in this chain's stores
}

export const STORE_CHAINS: StoreChain[] = [
  {
    id: 'colruyt',
    name: 'Colruyt',
    color: '#E31837',
    textColor: '#fff',
    osmBrand: 'Colruyt',
    logo: '🔴',
    country: ['BE'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie',
      'Boucherie',
      'Charcuterie & Fromages',
      'Produits frais',
      'Crémerie',
      'Épicerie salée',
      'Épicerie sucrée',
      'Boissons',
      'Surgelés',
      'Hygiène & Beauté',
      'Entretien',
      'Non-alimentaire',
    ],
  },
  {
    id: 'delhaize',
    name: 'Delhaize',
    color: '#E3001B',
    textColor: '#fff',
    osmBrand: 'Delhaize',
    logo: '🦁',
    country: ['BE'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie & Pâtisserie',
      'Boucherie',
      'Charcuterie',
      'Poissonnerie',
      'Produits laitiers',
      'Fromages',
      'Traiteur',
      'Épicerie',
      'Conserves',
      'Boissons',
      'Surgelés',
      'Hygiène',
      'Entretien',
    ],
  },
  {
    id: 'proxy_delhaize',
    name: 'Proxy Delhaize',
    color: '#E3001B',
    textColor: '#fff',
    osmBrand: 'Proxy Delhaize',
    logo: '🦁',
    country: ['BE'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie',
      'Charcuterie',
      'Produits frais',
      'Épicerie',
      'Boissons',
      'Surgelés',
      'Hygiène',
    ],
  },
  {
    id: 'lidl',
    name: 'Lidl',
    color: '#0050AA',
    textColor: '#FFD700',
    osmBrand: 'Lidl',
    logo: '🛒',
    country: ['BE', 'FR'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie',
      'Charcuterie & Fromages',
      'Produits frais',
      'Épicerie',
      'Boissons',
      'Surgelés',
      'Non-alimentaire',
      'Promotions semaine',
    ],
  },
  {
    id: 'aldi',
    name: 'Aldi',
    color: '#00468B',
    textColor: '#fff',
    osmBrand: 'Aldi',
    logo: '🔵',
    country: ['BE', 'FR'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie',
      'Charcuterie',
      'Produits frais',
      'Épicerie',
      'Boissons',
      'Surgelés',
      'Promotions',
    ],
  },
  {
    id: 'carrefour',
    name: 'Carrefour',
    color: '#007DC5',
    textColor: '#fff',
    osmBrand: 'Carrefour',
    logo: '⛵',
    country: ['BE', 'FR'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie & Pâtisserie',
      'Poissonnerie',
      'Boucherie',
      'Charcuterie',
      'Fromages',
      'Produits laitiers',
      'Traiteur',
      'Épicerie salée',
      'Épicerie sucrée',
      'Boissons',
      'Surgelés',
      'Droguerie & Hygiène',
      'Non-alimentaire',
    ],
  },
  {
    id: 'carrefour_market',
    name: 'Carrefour Market',
    color: '#007DC5',
    textColor: '#fff',
    osmBrand: 'Carrefour Market',
    logo: '⛵',
    country: ['BE', 'FR'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie',
      'Boucherie & Charcuterie',
      'Produits frais',
      'Épicerie',
      'Boissons',
      'Surgelés',
      'Hygiène',
    ],
  },
  {
    id: 'albert_heijn',
    name: 'Albert Heijn',
    color: '#00A0E2',
    textColor: '#fff',
    osmBrand: 'Albert Heijn',
    logo: '🏪',
    country: ['BE', 'NL'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie',
      'Charcuterie',
      'Produits frais',
      'Fromages',
      'Épicerie',
      'Boissons',
      'Surgelés',
      'Droguerie',
    ],
  },
  {
    id: 'okay',
    name: 'OKay',
    color: '#F4A100',
    textColor: '#fff',
    osmBrand: 'OKay',
    logo: '🟡',
    country: ['BE'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie',
      'Charcuterie',
      'Produits frais',
      'Épicerie',
      'Boissons',
      'Surgelés',
    ],
  },
  {
    id: 'jumbo',
    name: 'Jumbo',
    color: '#FDC300',
    textColor: '#000',
    osmBrand: 'Jumbo',
    logo: '🟡',
    country: ['NL', 'BE'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie',
      'Charcuterie',
      'Produits frais',
      'Épicerie',
      'Boissons',
      'Surgelés',
      'Non-alimentaire',
    ],
  },
  {
    id: 'match',
    name: 'Match',
    color: '#E2001A',
    textColor: '#fff',
    osmBrand: 'Match',
    logo: '🏪',
    country: ['BE', 'FR'],
    departments: [
      'Fruits & Légumes',
      'Boulangerie',
      'Boucherie & Charcuterie',
      'Produits frais',
      'Épicerie',
      'Boissons',
      'Surgelés',
      'Hygiène',
    ],
  },
]

export function getChainById(id: string): StoreChain | undefined {
  return STORE_CHAINS.find(c => c.id === id)
}

/**
 * Map a shopping list category name to a chain's department name.
 * Returns the department name and its position in the store layout.
 */
export function mapCategoryToDepartment(category: string, chain: StoreChain): { dept: string; order: number } {
  const cat = category.toLowerCase()

  // Mapping rules: item category → which store department it belongs to
  const MAPPINGS: Array<{ keywords: string[]; dept: RegExp }> = [
    { keywords: ['fruit', 'légume', 'salade', 'tomate', 'pomme'], dept: /fruit|légume/i },
    { keywords: ['pain', 'boulang', 'viennoiserie', 'pâtisserie'], dept: /boulang|pâtisserie/i },
    { keywords: ['viande', 'boucherie', 'volaille', 'bœuf', 'porc'], dept: /boucherie/i },
    { keywords: ['charcuterie', 'jambon', 'saucisse', 'fromage'], dept: /charcuterie|fromage/i },
    { keywords: ['poisson', 'saumon', 'thon', 'crustacé'], dept: /poisson/i },
    { keywords: ['lait', 'beurre', 'crème', 'yaourt', 'œuf', 'oeuf'], dept: /laitier|crémerie|frais/i },
    { keywords: ['boisson', 'eau', 'jus', 'bière', 'vin', 'soda'], dept: /boisson/i },
    { keywords: ['surgelé', 'congelé', 'glace'], dept: /surgelé/i },
    { keywords: ['hygiène', 'shampoing', 'savon', 'dentifrice'], dept: /hygiène|beauté|droguerie/i },
    { keywords: ['entretien', 'nettoyant', 'lessive', 'vaisselle'], dept: /entretien|droguerie/i },
  ]

  for (const { keywords, dept } of MAPPINGS) {
    if (keywords.some(k => cat.includes(k))) {
      const idx = chain.departments.findIndex(d => dept.test(d))
      if (idx >= 0) return { dept: chain.departments[idx], order: idx }
    }
  }

  // Default: épicerie
  const epicerieIdx = chain.departments.findIndex(d => /épicerie/i.test(d))
  return {
    dept: epicerieIdx >= 0 ? chain.departments[epicerieIdx] : category,
    order: epicerieIdx >= 0 ? epicerieIdx : chain.departments.length,
  }
}

export interface SavedStore {
  chainId: string
  osmId?: number
  name: string       // e.g. "Colruyt Ixelles"
  city?: string
  address?: string
  lat?: number
  lon?: number
}
