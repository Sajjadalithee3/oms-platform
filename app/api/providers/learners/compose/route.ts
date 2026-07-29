import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBatchEmails } from "@/lib/email"
import { composeEmailTemplate } from "@/lib/email-templates"
import { logEmail } from "@/lib/email-log"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { learnerIds, courseName, subject, message } = body as {
    learnerIds?: string[]
    courseName?: string
    subject: string
    message: string
  }

  if (!subject || !message) return NextResponse.json({ error: "Subject and message are required" }, { status: 400 })
  if (!learnerIds?.length && !courseName) return NextResponse.json({ error: "Specify learnerIds or courseName" }, { status: 400 })

  const where: Record<string, unknown> = {}
  if (learnerIds?.length) where.id = { in: learnerIds }
  if (courseName) where.courseName = courseName

  if (session.user.role === "TRAINING_PROVIDER") {
    const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })
    where.providerId = provider.id
  }

  const learners = await prisma.learnerProfile.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
  })

  if (learners.length === 0) return NextResponse.json({ error: "No matching learners found" }, { status: 404 })

  const emails = learners.map((l) => ({
    to: l.user.email,
    learnerId: l.id,
    ...composeEmailTemplate({ name: l.user.name || "there", subject, message }),
  }))

  const result = await sendBatchEmails(emails)

  for (const e of emails) {
    await logEmail({ learnerId: e.learnerId, toEmail: e.to, subject: e.subject, body: e.html, category: "COMPOSE", sentById: session.user.id })
  }

  return NextResponse.json({ sent: result.sent, failed: result.failed, total: learners.length })
}
