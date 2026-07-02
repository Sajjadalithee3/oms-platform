import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const ads = await prisma.advertisement.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(ads)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { type, imageUrl, text, externalLink, startDate, endDate } = body as {
    type: string
    imageUrl?: string
    text?: string
    externalLink?: string
    startDate: string
    endDate: string
  }

  if (type !== "BANNER_IMAGE" && type !== "ANNOUNCEMENT_BAR") {
    return NextResponse.json({ error: "type must be BANNER_IMAGE or ANNOUNCEMENT_BAR" }, { status: 400 })
  }
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 })
  }

  const ad = await prisma.advertisement.create({
    data: {
      type,
      imageUrl: imageUrl || null,
      text: text || null,
      externalLink: externalLink || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdByRole: "SUPER_ADMIN",
      providerId: null,
    },
  })

  return NextResponse.json(ad)
}
