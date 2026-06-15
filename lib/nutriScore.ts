// Nutri-Score simplifié (barème « aliments généraux », version classique).
// Estimation : les lipides saturés sont approximés (≈ 40 % des lipides) quand
// la donnée n'est pas disponible, et le % fruits/légumes n'est pas connu.

export type Per100 = {
  kcal: number
  sugars: number
  fat: number
  satFat?: number
  salt?: number      // g/100 g (sel)
  sodium?: number    // mg/100 g (sinon dérivé du sel)
  fiber: number
  protein: number
}

export type NutriGrade = 'A' | 'B' | 'C' | 'D' | 'E'

export const NUTRI_COLOR: Record<NutriGrade, string> = {
  A: '#038141', B: '#85bb2f', C: '#fecb02', D: '#ee8100', E: '#e63e11',
}

const pts = (value: number, steps: number[]) => {
  for (let i = 0; i < steps.length; i++) if (value <= steps[i]) return i
  return steps.length
}

const ENERGY = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]      // kJ
const SUGARS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]                     // g
const SATFAT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]                                  // g
const SODIUM = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]               // mg
const FIBER  = [0.9, 1.9, 2.8, 3.7, 4.7]                                        // g
const PROT   = [1.6, 3.2, 4.8, 6.4, 8]                                          // g

/** Calcule la note Nutri-Score (A→E) pour un profil pour 100 g. */
export function nutriScore(p: Per100): { grade: NutriGrade; points: number; color: string } {
  const kJ = p.kcal * 4.184
  const satFat = p.satFat ?? p.fat * 0.4
  const sodium = p.sodium ?? (p.salt ?? 0) * 400 // 1 g sel ≈ 400 mg sodium

  const negative =
    pts(kJ, ENERGY) + pts(p.sugars, SUGARS) + pts(satFat, SATFAT) + pts(sodium, SODIUM)
  const fiberPts = pts(p.fiber, FIBER)
  const protPts = pts(p.protein, PROT)

  // Règle : au-delà de 11 points négatifs, les protéines ne comptent pas
  // (sauf fruits/légumes ≥ 5 pts, non disponible ici).
  const positive = negative >= 11 ? fiberPts : fiberPts + protPts
  const points = negative - positive

  let grade: NutriGrade = 'E'
  if (points <= -1) grade = 'A'
  else if (points <= 2) grade = 'B'
  else if (points <= 10) grade = 'C'
  else if (points <= 18) grade = 'D'
  return { grade, points, color: NUTRI_COLOR[grade] }
}
