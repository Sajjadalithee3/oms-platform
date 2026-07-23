import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const sectors = await prisma.sector.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(sectors)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const name = String(body.name || "").trim()
  if (!name) return NextResponse.json({ error: "Sector name is required" }, { status: 400 })

  const existing = await prisma.sector.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  })
  if (existing) return NextResponse.json({ error: "A sector with this name already exists" }, { status: 409 })

  const sector = await prisma.sector.create({ data: { name } })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "Sector", entityId: sector.id, detail: `Sector "${name}" added` },
  })

  return NextResponse.json(sector, { status: 201 })
}
