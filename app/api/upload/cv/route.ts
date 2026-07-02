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

    const allowedRoles = ["JOB_SEEKER", "LEARNER", "TRAINING_PROVIDER", "INTERNAL_STAFF", "SUPER_ADMIN"]
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("cv") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Accepted: PDF, DOC, DOCX" },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseCV(buffer, file.type)

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      parsed,
    })
  } catch (error) {
    console.error("CV upload error:", error)
    const msg = error instanceof Error ? error.message : "Failed to parse CV"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
