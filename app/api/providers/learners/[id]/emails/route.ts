import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { composeEmailTemplate } from "@/lib/email-templates"
import { logEmail } from "@/lib/email-log"

async function getLearnerForCaller(userId: string, role: string, learnerId: string) {
  const learner = await prisma.learnerProfile.findUnique({
    where: { id: learnerId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (!learner) return null
  if (role === "SUPER_ADMIN") return learner
  const provider = await prisma.providerProfile.findUnique({ where: { userId } })
  if (!provider || learner.providerId !== provider.id) return null
  return learner
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const learner = await getLearnerForCaller(session.user.id, session.user.role, params.id)
  if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 })

  const emails = await prisma.emailLog.findMany({
    where: { learnerId: params.id },
    include: { sentBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(emails)
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const learner = await getLearnerForCaller(session.user.id, session.user.role, params.id)
  if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 })

  const body = await request.json()
  const { subject, message } = body as { subject: string; message: string }
  if (!subject || !message) return NextResponse.json({ error: "Subject and message are required" }, { status: 400 })

  const emailContent = composeEmailTemplate({ name: learner.user.name || "there", subject, message })
  const sent = await sendEmail({ to: learner.user.email, ...emailContent })

  await logEmail({ learnerId: learner.id, toEmail: learner.user.email, subject: emailContent.subject, body: emailContent.html, category: "COMPOSE", sentById: session.user.id })

  return NextResponse.json({ sent })
}
