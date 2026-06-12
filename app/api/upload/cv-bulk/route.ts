import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseCV } from "@/lib/cv-parser"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const MAX_SIZE = 5 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["TRAINING_PROVIDER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const files = formData.getAll("cvs") as File[]
    const providerId = formData.get("providerId") as string
    const cohortId = formData.get("cohortId") as string | null

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const results = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        results.push({
          fileName: file.name,
          error: "Invalid file type",
          parsed: null,
        })
        continue
      }

      if (file.size > MAX_SIZE) {
        results.push({
          fileName: file.name,
          error: "File too large (max 5MB)",
          parsed: null,
        })
        continue
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const parsed = await parseCV(buffer, file.type)
        results.push({
          fileName: file.name,
          fileSize: file.size,
          error: null,
          parsed,
          providerId,
          cohortId,
        })
      } catch {
        results.push({
          fileName: file.name,
          error: "Failed to parse",
          parsed: null,
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Bulk CV upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
