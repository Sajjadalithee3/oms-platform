import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBatchEmails } from "@/lib/email"
import { credentialsEmailTemplate } from "@/lib/email-templates"
import { logEmail } from "@/lib/email-log"
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
  const { learnerIds } = body as { learnerIds: string[] }
  if (!learnerIds || !Array.isArray(learnerIds) || learnerIds.length === 0) {
    return NextResponse.json({ error: "No learners specified" }, { status: 400 })
  }

  const where: Record<string, unknown> = { id: { in: learnerIds } }
  if (session.user.role === "TRAINING_PROVIDER") {
    const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })
    where.providerId = provider.id
  }

  const learners = await prisma.learnerProfile.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } }, provider: { select: { organisationName: true } } },
  })

  if (learners.length === 0) {
    return NextResponse.json({ error: "No matching learners found" }, { status: 404 })
  }

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`
  const emails: Array<{ to: string; subject: string; html: string; learnerId: string }> = []
  for (const learner of learners) {
    const password = generatePassword()
    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { id: learner.user.id }, data: { password: hashedPassword, mustChangePassword: true } })
    await prisma.learnerProfile.update({ where: { id: learner.id }, data: { credentialsSent: true } })
    emails.push({
      to: learner.user.email,
      learnerId: learner.id,
      ...credentialsEmailTemplate({
        name: learner.user.name || "there",
        email: learner.user.email,
        password,
        loginUrl,
        providerName: learner.provider.organisationName,
        courseName: learner.courseName,
      }),
    })
  }

  const result = await sendBatchEmails(emails)

  for (const e of emails) {
    await logEmail({ learnerId: e.learnerId, toEmail: e.to, subject: e.subject, body: e.html, category: "CREDENTIALS", sentById: session.user.id })
  }

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "UPDATE", entity: "LearnerProfile", entityId: learners[0].id, detail: `Sent login credentials to ${learners.length} learner(s)` },
  })

  return NextResponse.json({ sent: result.sent, failed: result.failed, total: learners.length })
}
