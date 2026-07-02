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

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const access = await verifyApplicationAccess(params.id, session.user.id, session.user.role)
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

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

  const allowedRoles = ["SUPER_ADMIN", "INTERNAL_STAFF", "EMPLOYER"]
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (session.user.role === "EMPLOYER") {
    const access = await verifyApplicationAccess(params.id, session.user.id, session.user.role)
    if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { status } = body

  const validStatuses = ["APPLIED", "REVIEWING", "SHORTLISTED", "INTERVIEW", "OFFERED", "REJECTED", "WITHDRAWN"]
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

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
