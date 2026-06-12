import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const role = searchParams.get("role")
  const search = searchParams.get("search")

  const where: Record<string, unknown> = {}
  if (role) where.role = role
  if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }]

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(users)
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { id, isActive, role } = body

  const data: Record<string, unknown> = {}
  if (isActive !== undefined) data.isActive = isActive
  if (role) data.role = role

  const user = await prisma.user.update({ where: { id }, data })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "UPDATE", entity: "User", entityId: id, detail: `User updated: ${JSON.stringify(data)}` },
  })

  return NextResponse.json(user)
}
