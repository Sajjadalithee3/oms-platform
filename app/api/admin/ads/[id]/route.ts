import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
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
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  await prisma.advertisement.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
