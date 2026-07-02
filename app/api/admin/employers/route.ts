import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const employers = await prisma.employerProfile.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { jobs: true, interviews: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(employers)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { name, email, companyName, industry, location } = body

  if (!name || !email || !companyName) return NextResponse.json({ error: "Name, email, and company name are required" }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 })

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
  let password = ""
  for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role: "EMPLOYER" },
  })

  const employer = await prisma.employerProfile.create({
    data: { userId: user.id, companyName, industry: industry || null, location: location || null },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "EmployerProfile", entityId: employer.id, detail: `Employer "${companyName}" created` },
  })

  return NextResponse.json({ id: user.id, email, name, companyName, generatedPassword: password }, { status: 201 })
}
