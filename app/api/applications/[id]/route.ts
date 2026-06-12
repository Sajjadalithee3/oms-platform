import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      job: { include: { employer: { select: { companyName: true, userId: true } } } },
      jobSeeker: { include: { user: { select: { name: true, email: true } }, experiences: true, educations: true } },
      learner: { include: { user: { select: { name: true, email: true } }, experiences: true, educations: true } },
      messages: { include: { sender: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } },
      interviews: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(application)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { status } = body

  const application = await prisma.application.update({
    where: { id: params.id },
    data: { status },
  })

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: { job: true, jobSeeker: true, learner: true },
  })

  const candidateUserId = app?.jobSeeker?.userId || app?.learner?.userId
  if (candidateUserId) {
    await prisma.notification.create({
      data: { userId: candidateUserId, title: "Application Update", body: `Your application for "${app?.job.title}" is now ${status}`, type: "APPLICATION_UPDATE", link: `/${app?.jobSeeker ? "jobseeker" : "learner"}/applications/${params.id}` },
    })
  }

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "UPDATE", entity: "Application", entityId: params.id, detail: `Status changed to ${status}` },
  })

  return NextResponse.json(application)
}
