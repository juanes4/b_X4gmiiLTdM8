// SRP: módulo con una única responsabilidad — validar datos de partido.
// No sabe nada de UI, estado de React ni API.

export interface MatchEditData {
  score_team1: number | null
  score_team2: number | null
}

export function validateMatchEdit(data: MatchEditData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (data.score_team1 === null) errors.score_team1 = "Score is required"
  if (data.score_team2 === null) errors.score_team2 = "Score is required"
  return errors
}

/** Devuelve un mensaje de error si el marcador de medio tiempo supera el resultado final,
 *  o null si la combinación es válida. */
export function validateHalftimeScore(
  s1: number,
  s2: number,
  ht1: string,
  ht2: string,
): string | null {
  if (ht1 === "" || ht2 === "") return null
  const htScore1 = parseInt(ht1)
  const htScore2 = parseInt(ht2)
  if (htScore1 > s1 || htScore2 > s2) {
    return `HT (${htScore1}–${htScore2}) cannot exceed final score (${s1}–${s2})`
  }
  return null
}
