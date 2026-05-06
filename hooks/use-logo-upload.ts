import { useState } from "react"

interface UseLogoUploadReturn {
  upload: (file: File) => Promise<string>
  isUploading: boolean
  uploadError: string | null
}

export function useLogoUpload(): UseLogoUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const upload = async (file: File): Promise<string> => {
    setIsUploading(true)
    setUploadError(null)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/upload/logo", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      return data.url as string
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed"
      setUploadError(msg)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  return { upload, isUploading, uploadError }
}
