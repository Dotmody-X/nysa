/**
 * Demo Mode Toggle
 * 
 * Pour activer le "mode sans démo", ouvre la console et exécute:
 * localStorage.setItem('nysa:no-demo', 'true')
 * 
 * Pour désactiver:
 * localStorage.removeItem('nysa:no-demo')
 */

export function isDemoModeDisabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('nysa:no-demo') === 'true'
}

export function toggleDemoMode() {
  if (isDemoModeDisabled()) {
    localStorage.removeItem('nysa:no-demo')
    console.log('✅ Demo mode RE-ENABLED (reload page)')
  } else {
    localStorage.setItem('nysa:no-demo', 'true')
    console.log('✅ Demo mode DISABLED (reload page)')
  }
}

// Hook pour vérifier en composant
export function useNoDemoMode() {
  return isDemoModeDisabled()
}
