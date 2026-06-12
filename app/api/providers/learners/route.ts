import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const learners = await prisma.learnerProfile.findMany({
    where: { providerId: provider.id },
    include: { user: { select: { name: true, email: true } }, cohort: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(learners)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const body = await request.json()
  const { name, email, cohortId, courseName, courseSector, skills, phone, location } = body

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 })

  const password = generatePassword()
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name, role: "LEARNER" },
  })

  const learner = await prisma.learnerProfile.create({
    data: {
      userId: user.id, providerId: provider.id,
      cohortId: cohortId || null,
      courseName: courseName || null,
      courseSector: courseSector || null,
      skills: skills ? JSON.stringify(skills) : "[]",
      phone: phone || null,
      location: location || null,
    },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "LearnerProfile", entityId: learner.id, detail: `Learner "${name}" created by provider` },
  })

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name }, learner, generatedPassword: password }, { status: 201 })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { id, ragStatus, ms1Achieved, ms2Achieved, ms3Achieved, ms1Date, ms2Date, ms3Date, cohortId } = body

  const learner = await prisma.learnerProfile.update({
    where: { id },
    data: {
      ragStatus, cohortId,
      ms1Achieved, ms2Achieved, ms3Achieved,
      ms1Date: ms1Date ? new Date(ms1Date) : undefined,
      ms2Date: ms2Date ? new Date(ms2Date) : undefined,
      ms3Date: ms3Date ? new Date(ms3Date) : undefined,
    },
  })

  return NextResponse.json(learner)
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
