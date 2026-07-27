import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProviderQuotaStatus } from "@/lib/quota"
import bcrypt from "bcryptjs"

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { learners, providerId } = body as { learners: Array<{ name: string; email: string; cohortId?: string; courseName?: string; courseSector?: string }>; providerId?: string }

  const provider = session.user.role === "SUPER_ADMIN" && providerId
    ? await prisma.providerProfile.findUnique({ where: { id: providerId } })
    : await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  if (!learners || !Array.isArray(learners) || learners.length === 0) {
    return NextResponse.json({ error: "No learners provided" }, { status: 400 })
  }

  if (learners.length > 200) {
    return NextResponse.json({ error: "Maximum 200 learners per batch" }, { status: 400 })
  }

  const quotaStatus = await getProviderQuotaStatus(provider.id)
  let remainingQuota = quotaStatus.remaining
  let skippedDueToQuota = 0

  const results: Array<{ learnerId?: string; name: string; email: string; password: string; status: "created" | "skipped"; reason?: string }> = []

  for (const learner of learners) {
    if (remainingQuota <= 0) {
      skippedDueToQuota++
      results.push({ name: learner.name || "", email: learner.email || "", password: "", status: "skipped", reason: `Monthly learner quota reached (${quotaStatus.cap}/${quotaStatus.cap}). Ask an admin to raise your limit.` })
      continue
    }

    if (!learner.name || !learner.email) {
      results.push({ name: learner.name || "", email: learner.email || "", password: "", status: "skipped", reason: "Missing name or email" })
      continue
    }

    const existing = await prisma.user.findUnique({ where: { email: learner.email } })
    if (existing) {
      results.push({ name: learner.name, email: learner.email, password: "", status: "skipped", reason: "Email already registered" })
      continue
    }

    const password = generatePassword()
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { email: learner.email, password: hashedPassword, name: learner.name, role: "LEARNER", mustChangePassword: true },
    })

    const learnerProfile = await prisma.learnerProfile.create({
      data: {
        userId: user.id,
        providerId: provider.id,
        cohortId: learner.cohortId || null,
        courseName: learner.courseName || null,
        courseSector: learner.courseSector || null,
        skills: "[]",
      },
    })

    remainingQuota--
    results.push({ learnerId: learnerProfile.id, name: learner.name, email: learner.email, password, status: "created" })
  }

  const createdCount = results.filter(r => r.status === "created").length

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "LearnerProfile",
      entityId: provider.id,
      detail: `Bulk upload: ${createdCount} learners created, ${results.length - createdCount} skipped${skippedDueToQuota > 0 ? `, ${skippedDueToQuota} skipped due to quota limit` : ""}`,
    },
  })

  return NextResponse.json({
    results,
    created: createdCount,
    skipped: results.length - createdCount,
    skippedDueToQuota,
    quota: { cap: quotaStatus.cap, used: quotaStatus.used + createdCount, remaining: Math.max(0, quotaStatus.remaining - createdCount) },
  }, { status: 201 })
}
