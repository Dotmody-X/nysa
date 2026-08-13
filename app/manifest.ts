import type { MetadataRoute } from 'next'

// Manifest PWA — rend NYSA installable (écran d'accueil / bureau).
// Next ajoute automatiquement <link rel="manifest"> à partir de ce fichier.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NYSA — Focus. Plan. Progress.',
    short_name: 'NYSA',
    description: 'Ton dashboard personnel tout-en-un.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6f5f2',
    theme_color: '#f6f5f2',
    lang: 'fr',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
