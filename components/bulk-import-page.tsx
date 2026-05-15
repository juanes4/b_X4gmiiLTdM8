"use client"

import { useState, useCallback, useRef } from "react"
import Papa from "papaparse"
import {
  ArrowLeft, Upload, Download, CheckCircle2, XCircle, AlertCircle,
  Users, Shield, Loader2, FileSpreadsheet, Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { playersApi, teamsApi } from "@/lib/api"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

type ImportType = "players" | "teams"
type RowStatus = "valid" | "invalid" | "pending" | "success" | "error"

interface BaseRow {
  errors: string[]
  status: RowStatus
  apiError?: string
}

interface PlayerRow extends BaseRow {
  type: "player"
  name: string
  age: number
  position: string
  number: number
}

interface TeamRow extends BaseRow {
  type: "team"
  name: string
  country: string
  city: string
  abbreviation: string
  state: string
}

type ParsedRow = PlayerRow | TeamRow

// ── Constants ──────────────────────────────────────────────────────────────────

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"]
const STATES = ["active", "inactive", "suspended"]

const PLAYER_TEMPLATE = `name,age,position,number
John Doe,25,Goalkeeper,1
Jane Smith,22,Midfielder,10
Carlos López,28,Defender,4
María García,20,Forward,9`

const TEAM_TEMPLATE = `name,country,city,abbreviation,state
Real Medellín,Colombia,Medellín,RMED,active
Nacional FC,Colombia,Bogotá,NAL,active
Sporting Club,Argentina,Buenos Aires,SCB,active`

// ── Validation ─────────────────────────────────────────────────────────────────

function normalizeKey(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const val = raw[k]
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return String(val).trim()
    }
  }
  return ""
}

function validatePlayer(raw: Record<string, unknown>): PlayerRow {
  const errors: string[] = []

  const name = normalizeKey(raw, "name", "nombre")
  if (!name) errors.push("Name is required")

  const ageStr = normalizeKey(raw, "age", "edad")
  const age = parseInt(ageStr, 10)
  if (!ageStr || isNaN(age)) errors.push("Age must be a valid number")
  else if (age < 15 || age > 50) errors.push("Age must be between 15 and 50")

  const posRaw = normalizeKey(raw, "position", "posicion", "pos")
  const position = POSITIONS.find(p => p.toLowerCase() === posRaw.toLowerCase()) ?? posRaw
  if (!posRaw) errors.push("Position is required")
  else if (!POSITIONS.includes(position)) errors.push(`Position must be one of: ${POSITIONS.join(", ")}`)

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

function validateTeam(raw: Record<string, unknown>): TeamRow {
  const errors: string[] = []

  const name = normalizeKey(raw, "name", "nombre")
  if (!name) errors.push("Name is required")

  const country = normalizeKey(raw, "country", "pais", "país")
  if (!country) errors.push("Country is required")

  const city = normalizeKey(raw, "city", "ciudad")
  if (!city) errors.push("City is required")

  const abbreviation = normalizeKey(raw, "abbreviation", "abbr", "abreviacion").toUpperCase()
  if (!abbreviation) errors.push("Abbreviation is required")
  else if (abbreviation.length > 5) errors.push("Abbreviation must be 5 characters or less")

  const stateRaw = normalizeKey(raw, "state", "estado").toLowerCase() || "active"
  const state = STATES.includes(stateRaw) ? stateRaw : "active"

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function downloadTemplate(type: ImportType) {
  const content = type === "players" ? PLAYER_TEMPLATE : TEAM_TEMPLATE
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${type}_template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RowStatus }) {
  const map: Record<RowStatus, { label: string; className: string }> = {
    valid:   { label: "Valid",     className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    invalid: { label: "Invalid",   className: "bg-red-100 text-red-700 border-red-200" },
    pending: { label: "Pending",   className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    success: { label: "Imported",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    error:   { label: "Failed",    className: "bg-red-100 text-red-700 border-red-200" },
  }
  const { label, className } = map[status]
  return <Badge className={className}>{label}</Badge>
}

// ── Main component ─────────────────────────────────────────────────────────────

interface BulkImportPageProps {
  onBack?: () => void
}

export function BulkImportPage({ onBack }: BulkImportPageProps) {
  const [importType, setImportType] = useState<ImportType>("players")
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [isDone, setIsDone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetFileState = () => {
    setRows([])
    setFileName(null)
    setParseError(null)
    setIsDone(false)
    setImportedCount(0)
  }

  const handleTypeChange = (type: ImportType) => {
    setImportType(type)
    resetFileState()
  }

  const applyRows = useCallback(
    (data: Record<string, unknown>[], fname: string) => {
      setFileName(fname)
      setParseError(null)
      setIsDone(false)
      setImportedCount(0)

      if (data.length === 0) {
        setParseError("The file appears to be empty or has no data rows.")
        setRows([])
        return
      }

      const parsed =
        importType === "players"
          ? data.map(validatePlayer)
          : data.map(validateTeam)

      setRows(parsed)
    },
    [importType]
  )

  const handleFile = useCallback(
    async (file: File) => {
      const name = file.name.toLowerCase()

      if (name.endsWith(".csv") || file.type === "text/csv") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
          complete: (result) => {
            if (result.errors.length > 0 && result.data.length === 0) {
              setParseError("Could not parse the CSV file. Please check the format.")
              return
            }
            applyRows(result.data as Record<string, unknown>[], file.name)
          },
          error: () => setParseError("Failed to read the CSV file."),
        })
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        try {
          const XLSX = await import("xlsx")
          const buffer = await file.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: "array" })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[]
          const normalized = raw.map((row) =>
            Object.fromEntries(
              Object.entries(row).map(([k, v]) => [
                k.trim().toLowerCase().replace(/\s+/g, "_"),
                v,
              ])
            )
          )
          applyRows(normalized, file.name)
        } catch {
          setParseError(
            "Failed to read the Excel file. Make sure it is a valid .xlsx or .xls file."
          )
        }
      } else {
        setParseError(
          "Unsupported format. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file."
        )
      }
    },
    [applyRows]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ""
    },
    [handleFile]
  )

  const handleImport = async () => {
    const toImport = rows.filter((r) => r.status === "valid")
    if (toImport.length === 0) return

    setIsImporting(true)
    setIsDone(false)
    setImportedCount(0)

    setRows((prev) =>
      prev.map((r) => (r.status === "valid" ? { ...r, status: "pending" as RowStatus } : r))
    )

    let count = 0

    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status !== "valid") continue
      const row = rows[i]

      try {
        if (row.type === "player") {
          await playersApi.create({
            name: row.name,
            age: row.age,
            position: row.position,
            number: row.number,
            team_id: null,
          })
        } else {
          await teamsApi.create({
            name: row.name,
            country: row.country,
            city: row.city,
            abbreviation: row.abbreviation,
            state: row.state,
          })
        }
        count++
        setImportedCount(count)
        setRows((prev) => {
          const next = [...prev]
          next[i] = { ...next[i], status: "success" }
          return next
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Import failed"
        setRows((prev) => {
          const next = [...prev]
          next[i] = { ...next[i], status: "error", apiError: msg }
          return next
        })
      }
    }

    setIsImporting(false)
    setIsDone(true)
  }

  // Derived counts
  const validCount   = rows.filter((r) => r.status === "valid").length
  const invalidCount = rows.filter((r) => r.status === "invalid").length
  const successCount = rows.filter((r) => r.status === "success").length
  const failCount    = rows.filter((r) => r.status === "error").length
  const toImportCount = validCount + rows.filter((r) => r.status === "pending").length

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h2 className="text-xl font-semibold text-foreground">Bulk Import</h2>
          <p className="text-muted-foreground text-sm">
            Import multiple players or teams from a CSV or Excel file
          </p>
        </div>
      </div>

      {/* ── Type selector ── */}
      <div className="flex gap-3 flex-wrap">
        {(["players", "teams"] as ImportType[]).map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            disabled={isImporting}
            className={cn(
              "flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all text-left",
              importType === type
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            {type === "players" ? (
              <Users className="h-5 w-5 shrink-0" />
            ) : (
              <Shield className="h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-medium text-sm capitalize">{type}</p>
              <p className="text-xs opacity-70">
                {type === "players" ? "Import player roster" : "Import team list"}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Format info + template ── */}
      <div className="bg-card rounded-xl border p-4 flex items-start gap-4">
        <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">
            Required columns for {importType}
          </p>
          {importType === "players" ? (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {["name", "age", "position", "number"].map((col) => (
                <span key={col} className="font-mono bg-muted px-1 rounded mr-1">{col}</span>
              ))}
              &mdash; Position: {POSITIONS.join(", ")} &middot; Age: 15–50 &middot; Jersey: 1–99
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {["name", "country", "city", "abbreviation"].map((col) => (
                <span key={col} className="font-mono bg-muted px-1 rounded mr-1">{col}</span>
              ))}
              <span className="font-mono bg-muted px-1 rounded mr-1">state</span>
              <span className="opacity-70">(optional)</span>
              &mdash; Abbreviation: max 5 chars &middot; State: active, inactive, suspended
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadTemplate(importType)}
          className="shrink-0"
        >
          <Download className="h-4 w-4 mr-2" />
          Download template
        </Button>
      </div>

      {/* ── Drop zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isImporting && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30",
          isImporting && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileInput}
          disabled={isImporting}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={cn("rounded-full p-4", isDragging ? "bg-primary/10" : "bg-muted")}>
            <Upload className={cn("h-7 w-7", isDragging ? "text-primary" : "text-muted-foreground")} />
          </div>
          {fileName ? (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <span className="font-medium text-sm text-foreground">{fileName}</span>
              <span className="text-xs text-muted-foreground">— click to change</span>
            </div>
          ) : (
            <>
              <p className="font-medium text-foreground">
                Drop your file here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports CSV (.csv) and Excel (.xlsx, .xls)
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Parse error ── */}
      {parseError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <XCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{parseError}</p>
        </div>
      )}

      {/* ── Preview table ── */}
      {rows.length > 0 && (
        <div className="bg-card rounded-xl border">
          {/* Table toolbar */}
          <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                Preview — {rows.length} row{rows.length !== 1 ? "s" : ""}
              </span>
              {validCount > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  {validCount} valid
                </Badge>
              )}
              {invalidCount > 0 && (
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  {invalidCount} invalid
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isDone && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {successCount} imported{failCount > 0 ? `, ${failCount} failed` : ""}
                  </span>
                  <Button variant="outline" size="sm" onClick={resetFileState}>
                    Import another file
                  </Button>
                </>
              )}
              {isImporting && (
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing {importedCount} of {toImportCount}…
                </span>
              )}
              {!isDone && !isImporting && validCount > 0 && (
                <Button onClick={handleImport} size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import {validCount} record{validCount !== 1 ? "s" : ""}
                </Button>
              )}
            </div>
          </div>

          {/* Table body */}
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {(importType === "players"
                    ? ["#", "Name", "Age", "Position", "Jersey #", "Status"]
                    : ["#", "Name", "Country", "City", "Abbr.", "State", "Status"]
                  ).map((col) => (
                    <th
                      key={col}
                      className="sticky top-0 z-10 text-left px-4 py-2.5 font-medium text-muted-foreground bg-card border-b border-border whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      "border-t",
                      (row.status === "invalid" || row.status === "error") && "bg-red-50/60",
                      row.status === "success" && "bg-emerald-50/60"
                    )}
                  >
                    <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>

                    {row.type === "player" ? (
                      <>
                        <td className="px-4 py-3 font-medium">
                          {row.name || <span className="text-muted-foreground italic">empty</span>}
                        </td>
                        <td className="px-4 py-3">{row.age || "—"}</td>
                        <td className="px-4 py-3">{row.position || "—"}</td>
                        <td className="px-4 py-3">{row.number || "—"}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium">
                          {row.name || <span className="text-muted-foreground italic">empty</span>}
                        </td>
                        <td className="px-4 py-3">{row.country || "—"}</td>
                        <td className="px-4 py-3">{row.city || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.abbreviation || "—"}</td>
                        <td className="px-4 py-3">{row.state || "—"}</td>
                      </>
                    )}

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 min-w-[120px]">
                        <StatusBadge status={row.status} />
                        {row.errors.length > 0 && (
                          <ul className="text-xs text-red-600 space-y-0.5 mt-0.5">
                            {row.errors.map((e, i) => (
                              <li key={i}>· {e}</li>
                            ))}
                          </ul>
                        )}
                        {row.apiError && (
                          <p className="text-xs text-red-600 mt-0.5">· {row.apiError}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Import result summary ── */}
      {isDone && (
        <div
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl border",
            failCount === 0
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : successCount === 0
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-yellow-50 border-yellow-200 text-yellow-700"
          )}
        >
          {failCount === 0 ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : successCount === 0 ? (
            <XCircle className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <p className="text-sm font-medium">
            {failCount === 0
              ? `All ${successCount} record${successCount !== 1 ? "s" : ""} imported successfully!`
              : successCount === 0
              ? `Import failed for all ${failCount} record${failCount !== 1 ? "s" : ""}. Check the errors above.`
              : `${successCount} imported, ${failCount} failed. Review the errors above for failed rows.`}
          </p>
        </div>
      )}
    </div>
  )
}
