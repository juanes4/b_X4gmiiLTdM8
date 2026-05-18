"use client"

// DIP: este componente depende de abstracciones (ImportStrategy, parseFile),
//      no de implementaciones concretas de la API.
// SRP: responsabilidad única — orquestar la UI del flujo de importación.

import { useState, useCallback, useRef } from "react"
import {
  ArrowLeft, Upload, Download, CheckCircle2, XCircle, AlertCircle,
  Loader2, FileSpreadsheet, Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { parseFile } from "@/lib/import/parsers"
import { IMPORT_STRATEGIES } from "@/lib/import/strategies"
import type { ImportType, ParsedRow, RowStatus } from "@/lib/import/types"
import { cn } from "@/lib/utils"

// ── Helpers locales (UI puro) ──────────────────────────────────────────────────

function downloadTemplate(type: ImportType, content: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${type}_template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function StatusBadge({ status }: { status: RowStatus }) {
  const map: Record<RowStatus, { label: string; className: string }> = {
    valid:   { label: "Valid",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    invalid: { label: "Invalid",  className: "bg-red-100 text-red-700 border-red-200" },
    pending: { label: "Pending",  className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    success: { label: "Imported", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    error:   { label: "Failed",   className: "bg-red-100 text-red-700 border-red-200" },
  }
  const { label, className } = map[status]
  return <Badge className={className}>{label}</Badge>
}

// ── Componente principal ───────────────────────────────────────────────────────

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

  // La estrategia activa encapsula toda la lógica específica del tipo (OCP + DIP)
  const strategy = IMPORT_STRATEGIES[importType]

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

  // parseFile (SRP externo) convierte el File en filas crudas.
  // strategy.validate (SRP externo) convierte cada fila cruda en un ParsedRow tipado.
  const handleFile = useCallback(
    async (file: File) => {
      const { rows: raw, error } = await parseFile(file)
      if (error) {
        setParseError(error)
        setRows([])
        setFileName(null)
        return
      }
      setFileName(file.name)
      setParseError(null)
      setIsDone(false)
      setImportedCount(0)
      if (raw.length === 0) {
        setParseError("The file appears to be empty or has no data rows.")
        setRows([])
        return
      }
      setRows(raw.map(strategy.validate))
    },
    [strategy]
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

  // strategy.save (DIP) persiste cada fila — el componente no sabe qué API se usa.
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
      try {
        await strategy.save(rows[i])
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

  const validCount    = rows.filter((r) => r.status === "valid").length
  const invalidCount  = rows.filter((r) => r.status === "invalid").length
  const successCount  = rows.filter((r) => r.status === "success").length
  const failCount     = rows.filter((r) => r.status === "error").length
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

      {/* ── Selector de tipo — OCP: iterar el mapa, no bifurcar ── */}
      <div className="flex gap-3 flex-wrap">
        {(Object.keys(IMPORT_STRATEGIES) as ImportType[]).map((type) => {
          const { Icon, label, description } = IMPORT_STRATEGIES[type]
          return (
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
              <Icon className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium text-sm capitalize">{label}</p>
                <p className="text-xs opacity-70">{description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Panel de información — datos desde la estrategia, sin bifurcaciones ── */}
      <div className="bg-card rounded-xl border p-4 flex items-start gap-4">
        <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">
            Required columns for {strategy.label.toLowerCase()}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {strategy.requiredColumns.map((col) => (
              <span key={col} className="font-mono bg-muted px-1 rounded mr-1">{col}</span>
            ))}
            {strategy.optionalColumns?.map((col) => (
              <span key={col}>
                <span className="font-mono bg-muted px-1 rounded mr-1">{col}</span>
                <span className="opacity-70 mr-1">(optional)</span>
              </span>
            ))}
            &mdash; {strategy.note}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadTemplate(importType, strategy.templateContent)}
          className="shrink-0"
        >
          <Download className="h-4 w-4 mr-2" />
          Download template
        </Button>
      </div>

      {/* ── Zona de drop ── */}
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
              <p className="font-medium text-foreground">Drop your file here or click to browse</p>
              <p className="text-sm text-muted-foreground">Supports CSV (.csv) and Excel (.xlsx, .xls)</p>
            </>
          )}
        </div>
      </div>

      {/* ── Error de parseo ── */}
      {parseError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <XCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{parseError}</p>
        </div>
      )}

      {/* ── Tabla de previsualización — columnas y celdas desde la estrategia ── */}
      {rows.length > 0 && (
        <div className="bg-card rounded-xl border">
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

          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  {["#", ...strategy.columns, "Status"].map((col) => (
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
                {rows.map((row, idx) => {
                  const fields = strategy.getDisplayFields(row)
                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "border-t",
                        (row.status === "invalid" || row.status === "error") && "bg-red-50/60",
                        row.status === "success" && "bg-emerald-50/60"
                      )}
                    >
                      <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                      {fields.map((val, colIdx) => (
                        <td
                          key={colIdx}
                          className={cn("px-4 py-3", colIdx === 0 && "font-medium")}
                        >
                          {colIdx === 0 && !val ? (
                            <span className="text-muted-foreground italic">empty</span>
                          ) : (
                            val || "—"
                          )}
                        </td>
                      ))}
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Resumen final ── */}
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
