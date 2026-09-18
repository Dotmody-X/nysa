/**
 * Un petit signal sonore quand un mail arrive, pendant que le poste est
 * ouvert. iOS ne laisse jouer un son qu'après un geste : on ouvre le
 * contexte audio au premier toucher et on le garde.
 */
let ctx: AudioContext | null = null

export function armerSon() {
  if (typeof window === 'undefined') return
  const ouvrir = () => {
    try {
      ctx = ctx ?? new AudioContext()
      if (ctx.state === 'suspended') void ctx.resume()
    } catch { /* pas d'audio ici */ }
  }
  window.addEventListener('pointerdown', ouvrir, { passive: true })
  window.addEventListener('keydown', ouvrir)
}

/** Deux notes brèves, douces. */
export function jouerSon() {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  for (const [freq, debut] of [[880, 0], [1174.66, 0.12]] as const) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t + debut)
    gain.gain.exponentialRampToValueAtTime(0.12, t + debut + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + debut + 0.28)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t + debut)
    osc.stop(t + debut + 0.3)
  }
}
