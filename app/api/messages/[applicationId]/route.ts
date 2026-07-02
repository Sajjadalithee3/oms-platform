import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function verifyApplicationAccess(applicationId: string, userId: string, userRole: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: { include: { employer: true } },
      jobSeeker: true,
      learner: { include: { provider: true } },
    },
  })

  if (!application) return null

  if (userRole === "SUPER_ADMIN" || userRole === "INTERNAL_STAFF") return application

  if (userRole === "JOB_SEEKER" && application.jobSeeker?.userId === userId) return application
  if (userRole === "LEARNER" && application.learner?.userId === userId) return application
  if (userRole === "EMPLOYER" && application.job.employer?.userId === userId) return application

  if (userRole === "TRAINING_PROVIDER") {
    const provider = await prisma.providerProfile.findUnique({ where: { userId } })
    if (provider && application.learner?.providerId === provider.id) return application
  }

  return null
}

export async function GET(_request: Request, { params }: { params: { applicationId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const application = await verifyApplicationAccess(params.applicationId, session.user.id, session.user.role)
  if (!application) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const messages = await prisma.message.findMany({
    where: { applicationId: params.applicationId },
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  })

  await prisma.message.updateMany({
    where: { applicationId: params.applicationId, isRead: false, senderId: { not: session.user.id } },
    data: { isRead: true },
  })

  return NextResponse.json(messages)
}

export async function POST(request: Request, { params }: { params: { applicationId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (session.user.role === "TRAINING_PROVIDER") {
    return NextResponse.json({ error: "Providers have read-only access to messages" }, { status: 403 })
  }

  const application = await verifyApplicationAccess(params.applicationId, session.user.id, session.user.role)
  if (!application) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { content } = body

  if (!content?.trim()) return NextResponse.json({ error: "Message content required" }, { status: 400 })

  const message = await prisma.message.create({
    data: { applicationId: params.applicationId, senderId: session.user.id, content: content.trim() },
    include: { sender: { select: { name: true, role: true } } },
  })

  let recipientUserId: string | null = null
  if (session.user.role === "EMPLOYER") {
    recipientUserId = application.jobSeeker?.userId || application.learner?.userId || null
  } else {
    recipientUserId = application.job.employer?.userId || null
  }

  if (recipientUserId) {
    await prisma.notification.create({
      data: { userId: recipientUserId, title: "New Message", body: `${session.user.name || "Someone"} sent you a message`, type: "MESSAGE", link: `/messages` },
    })
  }

  return NextResponse.json(message, { status: 201 })
}
