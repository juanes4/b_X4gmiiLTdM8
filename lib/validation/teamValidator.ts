// SRP: módulo con una única responsabilidad — validar datos de equipo.
// No sabe nada de UI, estado de React ni API.

const MIN_PLAYERS = 11

export function isValidLogoValue(s: string): boolean {
  if (!s) return true
  if (s.startsWith("/uploads/")) return true
  try { new URL(s); return true } catch { return false }
}

export interface TeamFormData {
  name: string
  country: string
  city: string
  abbreviation: string
  logo?: string
  state: string
  players: { id: string }[]
}

/** Validación completa para crear un equipo nuevo (incluye mínimo de jugadores) */
export function validateTeamForm(data: TeamFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.name.trim()) errors.name = "Please enter the team name"
  else if (data.name.trim().length < 2) errors.name = "The team name must be at least 2 characters long"
  if (!data.country.trim()) errors.country = "Please enter the country"
  if (!data.city.trim()) errors.city = "Please enter the city"
  if (!data.abbreviation.trim()) errors.abbreviation = "Please enter an abbreviation (e.g. FCB)"
  else if (data.abbreviation.length > 5) errors.abbreviation = "The abbreviation cannot be longer than 5 characters"
  if (data.logo && !isValidLogoValue(data.logo)) errors.logo = "The logo link doesn't look like a valid web address"
  if (!data.state) errors.state = "Please select a status for the team"
  if (data.players.length < MIN_PLAYERS)
    errors.players = `You need to select ${MIN_PLAYERS} players (${data.players.length} selected so far)`
  return errors
}

export interface TeamEditData {
  name: string
  country: string
  city: string
  logo?: string
}

/** Validación para editar un equipo existente (sin requerir jugadores) */
export function validateTeamEdit(data: TeamEditData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.name.trim()) errors.name = "Name is required"
  if (!data.country.trim()) errors.country = "Country is required"
  if (!data.city.trim()) errors.city = "City is required"
  if (data.logo && !isValidLogoValue(data.logo)) errors.logo = "The logo link doesn't look like a valid web address"
  return errors
}
