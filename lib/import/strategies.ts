// OCP: para añadir un nuevo tipo de importación (ej. ligas) basta con agregar
//      una nueva entrada al mapa IMPORT_STRATEGIES — sin tocar código existente.
//
// ISP: cada estrategia sólo usa el método .create() de su API correspondiente,
//      no depende de la interfaz completa de teamsApi/playersApi.
//
// DIP: BulkImportPage dependerá de esta abstracción (ImportStrategy),
//      no de las implementaciones concretas de la API.

import { playersApi, teamsApi } from "@/lib/api"
import { validatePlayer, validateTeam, POSITIONS } from "./validators"
import type { ImportType, ImportStrategy, ParsedRow, PlayerRow, TeamRow } from "./types"
import { Users, Shield } from "lucide-react"

// ── Templates ──────────────────────────────────────────────────────────────────

const PLAYER_TEMPLATE = `name,age,position,number
John Doe,25,Goalkeeper,1
Jane Smith,22,Midfielder,10
Carlos López,28,Defender,4
María García,20,Forward,9`

const TEAM_TEMPLATE = `name,country,city,abbreviation,state
Real Medellín,Colombia,Medellín,RMED,active
Nacional FC,Colombia,Bogotá,NAL,active
Sporting Club,Argentina,Buenos Aires,SCB,active`

// ── Strategy map ───────────────────────────────────────────────────────────────

export const IMPORT_STRATEGIES: Record<ImportType, ImportStrategy> = {
  players: {
    Icon: Users,
    label: "Players",
    description: "Import player roster",
    columns: ["Name", "Age", "Position", "Jersey #"],
    requiredColumns: ["name", "age", "position", "number"],
    note: `Position: ${POSITIONS.join(", ")} · Age: 15–50 · Jersey: 1–99`,
    templateContent: PLAYER_TEMPLATE,

    validate: validatePlayer,

    // ISP: sólo se usa playersApi.create — no dependemos de getAll, update, delete, etc.
    save: (row: ParsedRow) => {
      const r = row as PlayerRow
      return playersApi.create({
        name: r.name,
        age: r.age,
        position: r.position,
        number: r.number,
        team_id: null,
      })
    },

    getDisplayFields: (row: ParsedRow) => {
      const r = row as PlayerRow
      return [r.name, r.age || "—", r.position || "—", r.number || "—"]
    },
  },

  teams: {
    Icon: Shield,
    label: "Teams",
    description: "Import team list",
    columns: ["Name", "Country", "City", "Abbr.", "State"],
    requiredColumns: ["name", "country", "city", "abbreviation"],
    optionalColumns: ["state"],
    note: "Abbreviation: max 5 chars · State: active, inactive, suspended",
    templateContent: TEAM_TEMPLATE,

    validate: validateTeam,

    // ISP: sólo se usa teamsApi.create — no dependemos del resto de la interfaz.
    save: (row: ParsedRow) => {
      const r = row as TeamRow
      return teamsApi.create({
        name: r.name,
        country: r.country,
        city: r.city,
        abbreviation: r.abbreviation,
        state: r.state,
      })
    },

    getDisplayFields: (row: ParsedRow) => {
      const r = row as TeamRow
      return [r.name, r.country || "—", r.city || "—", r.abbreviation || "—", r.state || "—"]
    },
  },
}
