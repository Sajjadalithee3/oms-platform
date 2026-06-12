import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: Request, { params }: { params: { applicationId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  const body = await request.json()
  const { content } = body

  if (!content?.trim()) return NextResponse.json({ error: "Message content required" }, { status: 400 })

  const message = await prisma.message.create({
    data: { applicationId: params.applicationId, senderId: session.user.id, content: content.trim() },
    include: { sender: { select: { name: true, role: true } } },
  })

  const application = await prisma.application.findUnique({
    where: { id: params.applicationId },
    include: { job: { include: { employer: true } }, jobSeeker: true, learner: true },
  })

  let recipientUserId: string | null = null
  if (session.user.role === "EMPLOYER") {
    recipientUserId = application?.jobSeeker?.userId || application?.learner?.userId || null
  } else {
    recipientUserId = application?.job.employer?.userId || null
  }

  if (recipientUserId) {
    await prisma.notification.create({
      data: { userId: recipientUserId, title: "New Message", body: `${session.user.name || "Someone"} sent you a message`, type: "MESSAGE", link: `/messages` },
    })
  }

  return NextResponse.json(message, { status: 201 })
}
