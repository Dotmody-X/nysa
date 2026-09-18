'use client'

import { useCallback, useEffect, useState } from 'react'
import { etatPush, activerPush, desactiverPush, type EtatPush } from '@/lib/push'

/** L'état des notifications push sur CET appareil, et les deux gestes. */
export function usePush() {
  const [etat, setEtat] = useState<EtatPush | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => { etatPush().then(setEtat) }, [])

  const activer = useCallback(async () => {
    setOccupe(true); setErreur(null)
    try { setEtat(await activerPush()) }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)) }
    finally { setOccupe(false) }
  }, [])

  const desactiver = useCallback(async () => {
    setOccupe(true); setErreur(null)
    try { setEtat(await desactiverPush()) }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)) }
    finally { setOccupe(false) }
  }, [])

  return { etat, occupe, erreur, activer, desactiver }
}
