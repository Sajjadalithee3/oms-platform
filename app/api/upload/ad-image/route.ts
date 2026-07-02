import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile } from "fs/promises"
import { join } from "path"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
const MAX_SIZE = 2 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "TRAINING_PROVIDER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("image") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Accepted: PNG, JPG, WebP, SVG" },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 2MB" },
        { status: 400 }
      )
    }

    const ext = file.name.split(".").pop() || "png"
    const fileName = `${session.user.id}-${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const uploadDir = join(process.cwd(), "public", "uploads", "ads")
    await writeFile(join(uploadDir, fileName), buffer)

    const url = `/uploads/ads/${fileName}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Ad image upload error:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
