/**
 * Demo Mode Toggle
 * 
 * Par défaut: Mode SANS démo (données vides)
 * Pour réactiver le mode démo avec données d'exemple:
 * localStorage.setItem('nysa:demo-enabled', 'true')
 * 
 * Ce flag est contrôlable via l'UI Settings
 */

export function isDemoModeDisabled(): boolean {
  if (typeof window === 'undefined') return true
  // Par défaut (pas de flag) = démo DISABLED (retourne true)
  // Si user active démo = localStorage.setItem('nysa:demo-enabled', 'true')
  return localStorage.getItem('nysa:demo-enabled') !== 'true'
}

export function isDemoModeEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('nysa:demo-enabled') === 'true'
}

export function toggleDemoMode() {
  if (isDemoModeEnabled()) {
    localStorage.removeItem('nysa:demo-enabled')
    console.log('✅ Mode démo DÉSACTIVÉ - Pages vides (reload page)')
  } else {
    localStorage.setItem('nysa:demo-enabled', 'true')
    console.log('✅ Mode démo ACTIVÉ - Données exemple visibles (reload page)')
  }
}

// Hook pour vérifier en composant
export function useNoDemoMode() {
  return isDemoModeDisabled()
}
