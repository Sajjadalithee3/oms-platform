import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBatchEmails } from "@/lib/email"
import { bulkNotificationEmailTemplate } from "@/lib/email-templates"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const body = await request.json()
  const { learnerIds, title, body: messageBody, link, sendEmail: shouldEmail } = body as {
    learnerIds: string[]
    title: string
    body: string
    link?: string
    sendEmail?: boolean
  }

  if (!learnerIds?.length || !title || !messageBody) {
    return NextResponse.json({ error: "learnerIds, title, and body are required" }, { status: 400 })
  }

  const learners = await prisma.learnerProfile.findMany({
    where: { id: { in: learnerIds }, providerId: provider.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (learners.length === 0) {
    return NextResponse.json({ error: "No matching learners found" }, { status: 404 })
  }

  await prisma.notification.createMany({
    data: learners.map((l) => ({
      userId: l.user.id,
      title,
      body: messageBody,
      type: "ANNOUNCEMENT",
      link: link || null,
    })),
  })

  let emailsSent = 0
  let emailsFailed = 0
  if (shouldEmail) {
    const result = await sendBatchEmails(
      learners.map((l) => ({
        to: l.user.email,
        ...bulkNotificationEmailTemplate({ name: l.user.name || "there", title, body: messageBody, link }),
      }))
    )
    emailsSent = result.sent
    emailsFailed = result.failed
  }

  return NextResponse.json({ notified: learners.length, emailsSent, emailsFailed })
}
