import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

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

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { name, email, role } = body

  if (!name || !email || !role) return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 })

  const password = generatePassword()
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role, mustChangePassword: true },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "User", entityId: user.id, detail: `User "${name}" created with role ${role}` },
  })

  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role, generatedPassword: password }, { status: 201 })
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
  let password = ""
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
