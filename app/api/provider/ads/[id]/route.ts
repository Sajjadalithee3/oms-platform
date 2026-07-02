import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const { id } = await params
  const existing = await prisma.advertisement.findUnique({ where: { id } })
  if (!existing || existing.providerId !== provider.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json()
  const { isActive, text, externalLink, startDate, endDate } = body as {
    isActive?: boolean
    text?: string
    externalLink?: string
    startDate?: string
    endDate?: string
  }

  const ad = await prisma.advertisement.update({
    where: { id },
    data: {
      ...(isActive !== undefined ? { isActive } : {}),
      ...(text !== undefined ? { text } : {}),
      ...(externalLink !== undefined ? { externalLink } : {}),
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
    },
  })

  return NextResponse.json(ad)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const { id } = await params
  const existing = await prisma.advertisement.findUnique({ where: { id } })
  if (!existing || existing.providerId !== provider.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.advertisement.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
