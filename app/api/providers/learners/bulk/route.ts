import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProviderQuotaStatus } from "@/lib/quota"
import { sendBatchEmails } from "@/lib/email"
import { credentialsEmailTemplate } from "@/lib/email-templates"
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

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const body = await request.json()
  const { learners } = body as { learners: Array<{ name: string; email: string; cohortId?: string; courseName?: string; courseSector?: string }> }

  if (!learners || !Array.isArray(learners) || learners.length === 0) {
    return NextResponse.json({ error: "No learners provided" }, { status: 400 })
  }

  if (learners.length > 200) {
    return NextResponse.json({ error: "Maximum 200 learners per batch" }, { status: 400 })
  }

  const quotaStatus = await getProviderQuotaStatus(provider.id)
  let remainingQuota = quotaStatus.remaining
  let skippedDueToQuota = 0

  const results: Array<{ name: string; email: string; password: string; status: "created" | "skipped"; reason?: string }> = []

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

    await prisma.learnerProfile.create({
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
    results.push({ name: learner.name, email: learner.email, password, status: "created" })
  }

  const createdCount = results.filter(r => r.status === "created").length

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`
  const { sent: emailsSent, failed: emailsFailed } = await sendBatchEmails(
    results
      .filter(r => r.status === "created")
      .map(r => ({ to: r.email, ...credentialsEmailTemplate({ name: r.name, email: r.email, password: r.password, loginUrl }) }))
  )

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
    emailsSent,
    emailsFailed,
    quota: { cap: quotaStatus.cap, used: quotaStatus.used + createdCount, remaining: Math.max(0, quotaStatus.remaining - createdCount) },
  }, { status: 201 })
}
