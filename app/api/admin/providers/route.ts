import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProviderLearnerCap } from "@/lib/quota"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const providers = await prisma.providerProfile.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { learners: true, courses: true, cohorts: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const withQuota = providers.map((p) => ({
    ...p,
    quotaCap: getProviderLearnerCap(p),
    quotaUsed: p._count.learners,
  }))

  return NextResponse.json(withQuota)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { name, email, organisationName, contactEmail } = body

  if (!name || !email || !organisationName) return NextResponse.json({ error: "Name, email, and organisation name are required" }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 })

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
  let password = ""
  for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role: "TRAINING_PROVIDER", mustChangePassword: true },
  })

  const provider = await prisma.providerProfile.create({
    data: { userId: user.id, organisationName, contactEmail: contactEmail || email },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "ProviderProfile", entityId: provider.id, detail: `Provider "${organisationName}" created` },
  })

  return NextResponse.json({ id: user.id, email, name, organisationName, generatedPassword: password }, { status: 201 })
}
