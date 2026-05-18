// SRP: este módulo tiene una única responsabilidad — validar filas crudas de CSV/Excel.
// No sabe nada de UI, parseo de archivos, ni llamadas a la API.

import type { PlayerRow, TeamRow } from "./types"
import { ENTITY_STATES } from "@/lib/api"

export const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"] as const

/** Busca el primer valor no vacío entre los alias de columna dados. */
export function normalizeKey(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const val = raw[k]
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim()
    }
  }
  return ""
}

export function validatePlayer(raw: Record<string, unknown>): PlayerRow {
  const errors: string[] = []

  const name = normalizeKey(raw, "name", "nombre")
  if (!name) errors.push("Name is required")

  const ageStr = normalizeKey(raw, "age", "edad")
  const age = parseInt(ageStr, 10)
  if (!ageStr || isNaN(age)) errors.push("Age must be a valid number")
  else if (age < 15 || age > 50) errors.push("Age must be a number between 15 and 50")

  const posRaw = normalizeKey(raw, "position", "posicion", "pos")
  const position = POSITIONS.find((p) => p.toLowerCase() === posRaw.toLowerCase()) ?? posRaw
  if (!posRaw) errors.push("Position is required")
  else if (!(POSITIONS as readonly string[]).includes(position))
    errors.push(`Position must be one of: ${POSITIONS.join(", ")}`)

  const numStr = normalizeKey(raw, "number", "jersey", "jersey_number", "numero")
  const number = parseInt(numStr, 10)
  if (!numStr || isNaN(number)) errors.push("Jersey number must be a valid number")
  else if (number < 1 || number > 99) errors.push("Jersey number must be between 1 and 99")

  return {
    type: "player",
    name,
    age: isNaN(age) ? 0 : age,
    position,
    number: isNaN(number) ? 0 : number,
    errors,
    status: errors.length === 0 ? "valid" : "invalid",
  }
}

export function validateTeam(raw: Record<string, unknown>): TeamRow {
  const errors: string[] = []

  const name = normalizeKey(raw, "name", "nombre")
  if (!name) errors.push("Name is required")

  const country = normalizeKey(raw, "country", "pais", "país")
  if (!country) errors.push("Country is required")

  const city = normalizeKey(raw, "city", "ciudad")
  if (!city) errors.push("City is required")

  const abbreviation = normalizeKey(raw, "abbreviation", "abbr", "abreviacion").toUpperCase()
  if (!abbreviation) errors.push("Please enter an abbreviation (e.g. FCB)")
  else if (abbreviation.length > 5) errors.push("The abbreviation cannot be longer than 5 characters")

  const stateRaw = normalizeKey(raw, "state", "estado").toLowerCase() || "active"
  const state = (ENTITY_STATES as readonly string[]).includes(stateRaw) ? stateRaw : "active"

  return {
    type: "team",
    name,
    country,
    city,
    abbreviation,
    state,
    errors,
    status: errors.length === 0 ? "valid" : "invalid",
  }
}
