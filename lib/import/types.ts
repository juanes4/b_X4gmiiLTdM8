// ── Primitive types ────────────────────────────────────────────────────────────

export type ImportType = "players" | "teams"
export type RowStatus = "valid" | "invalid" | "pending" | "success" | "error"

// ── Row models ─────────────────────────────────────────────────────────────────

export interface BaseRow {
  errors: string[]
  status: RowStatus
  apiError?: string
}

export interface PlayerRow extends BaseRow {
  type: "player"
  name: string
  age: number
  position: string
  number: number
}

export interface TeamRow extends BaseRow {
  type: "team"
  name: string
  country: string
  city: string
  abbreviation: string
  state: string
}

export type ParsedRow = PlayerRow | TeamRow

// ── Strategy interface (OCP + DIP) ────────────────────────────────────────────
// Each entity type implements this contract. Adding a new type (e.g. leagues)
// requires only a new entry in the strategies map — no changes to existing code.

export interface ImportStrategy {
  /** Componente icono de Lucide que representa el tipo de importación.
   *  Al incluirlo aquí, agregar un tipo nuevo no requiere tocar ningún otro archivo. */
  Icon: import("lucide-react").LucideIcon
  label: string
  description: string
  /** Table column headers, excluding the leading "#" and trailing "Status" */
  columns: string[]
  /** Required column names shown in the info panel */
  requiredColumns: string[]
  /** Optional column names shown in the info panel */
  optionalColumns?: string[]
  /** Human-readable constraint note shown in the info panel */
  note: string
  /** CSV template file content */
  templateContent: string
  /** Validate one raw CSV/Excel row → typed ParsedRow */
  validate: (raw: Record<string, unknown>) => ParsedRow
  /** Persist one valid row via the API (ISP: only .create is needed) */
  save: (row: ParsedRow) => Promise<unknown>
  /** Values to display in table columns (same order as `columns`) */
  getDisplayFields: (row: ParsedRow) => (string | number)[]
}
