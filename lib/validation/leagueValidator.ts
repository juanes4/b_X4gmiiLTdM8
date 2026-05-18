// SRP: módulo con una única responsabilidad — validar datos de liga.
// No sabe nada de UI, estado de React ni API.

export interface LeagueEditData {
  name: string
}

export function validateLeagueEdit(data: LeagueEditData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.name.trim()) errors.name = "Name is required"
  return errors
}
