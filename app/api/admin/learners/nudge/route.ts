import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBatchEmails } from "@/lib/email"
import { nudgeEmailTemplate } from "@/lib/email-templates"
import { logEmail } from "@/lib/email-log"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const { learnerIds } = body as { learnerIds?: string[] }

  const learners = await prisma.learnerProfile.findMany({
    where: {
      ...(learnerIds?.length ? { id: { in: learnerIds } } : {}),
      user: { lastLoginAt: null },
    },
    include: { user: { select: { name: true, email: true } } },
  })

  if (learners.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 })
  }

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`
  const emails = learners.map((l) => ({
    to: l.user.email,
    learnerId: l.id,
    ...nudgeEmailTemplate({ name: l.user.name || "there", loginUrl }),
  }))
  const result = await sendBatchEmails(emails)

  for (const e of emails) {
    await logEmail({ learnerId: e.learnerId, toEmail: e.to, subject: e.subject, body: e.html, category: "NUDGE", sentById: session.user.id })
  }

  return NextResponse.json(result)
}
