// SRP: este módulo tiene una única responsabilidad — convertir un File en filas crudas.
// No sabe nada de validación, UI, ni llamadas a la API.

import Papa from "papaparse"

export interface ParseResult {
  rows: Record<string, unknown>[]
  error: string | null
}

function normalizeHeaders(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase().replace(/\s+/g, "_"), v])
  )
}

function parseCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (result) => {
        if (result.errors.length > 0 && result.data.length === 0) {
          resolve({ rows: [], error: "Could not parse the CSV file. Please check the format." })
        } else {
          resolve({ rows: result.data as Record<string, unknown>[], error: null })
        }
      },
      error: () => resolve({ rows: [], error: "Failed to read the CSV file." }),
    })
  })
}

async function parseExcel(file: File): Promise<ParseResult> {
  try {
    const XLSX = await import("xlsx")
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array" })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[]
    return { rows: raw.map(normalizeHeaders), error: null }
  } catch {
    return {
      rows: [],
      error: "Failed to read the Excel file. Make sure it is a valid .xlsx or .xls file.",
    }
  }
}

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".csv") || file.type === "text/csv") return parseCsv(file)
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseExcel(file)
  return {
    rows: [],
    error: "Unsupported format. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.",
  }
}
