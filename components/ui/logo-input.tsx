"use client"

import { useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLogoUpload } from "@/hooks/use-logo-upload"
import { Upload, Link, X, Loader2 } from "lucide-react"

type Mode = "url" | "upload"

interface LogoInputProps {
  value: string
  onChange: (url: string) => void
  disabled?: boolean
  error?: boolean
}

export function LogoInput({ value, onChange, disabled, error }: LogoInputProps) {
  const [mode, setMode] = useState<Mode>("url")
  const fileRef = useRef<HTMLInputElement>(null)
  const { upload, isUploading, uploadError } = useLogoUpload()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await upload(file)
      onChange(url)
    } catch {
      // uploadError already set by hook
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-md bg-muted w-fit">
        <button
          type="button"
          onClick={() => setMode("url")}
          disabled={disabled || isUploading}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
            mode === "url"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link className="h-3 w-3" />
          URL
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          disabled={disabled || isUploading}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
            mode === "upload"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-3 w-3" />
          Upload
        </button>
      </div>

      {/* URL mode */}
      {mode === "url" && (
        <Input
          type="text"
          placeholder="https://example.com/logo.png"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={error ? "border-destructive" : ""}
        />
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
          />
          <Button
            type="button"
            variant="outline"
            className={`w-full ${error ? "border-destructive" : ""}`}
            disabled={disabled || isUploading}
            onClick={() => fileRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Choose image
              </>
            )}
          </Button>
          {uploadError && (
            <p className="text-xs text-destructive mt-1">{uploadError}</p>
          )}
        </div>
      )}

      {/* Preview + clear */}
      {value && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <div className="relative h-8 w-8 rounded border bg-background overflow-hidden shrink-0">
            <img
              src={value}
              alt="Logo preview"
              className="h-full w-full object-contain"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = "none"
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground truncate flex-1">{value}</p>
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled}
            className="rounded-full p-1 hover:bg-muted-foreground/20 shrink-0"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  )
}
