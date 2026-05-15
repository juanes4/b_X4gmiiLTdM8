import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "teams")
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPG, PNG, WebP or GIF." },
      { status: 400 }
    )
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 2 MB." },
      { status: 400 }
    )
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const filename = `${randomUUID()}.${ext}`
  const bytes = await file.arrayBuffer()

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(bytes))

  return NextResponse.json({ url: `/uploads/teams/${filename}` })
}
