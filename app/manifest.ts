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
    background_color: '#f5f1ed',
    theme_color: '#f5f1ed',
    lang: 'fr',
    orientation: 'portrait',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
