import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { applicationStatusEmailTemplate } from "@/lib/email-templates"
import { logEmail } from "@/lib/email-log"

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

  if (session.user.role === "EMPLOYER") {
    const agreement = await prisma.employerAgreement.findUnique({ where: { applicationId: params.id } })
    if (!agreement) {
      return NextResponse.json({
        id: application.id,
        jobId: application.jobId,
        job: { title: application.job.title, company: application.job.company },
        status: application.status,
        createdAt: application.createdAt,
        agreementRequired: true,
      })
    }

    const employerId = access.job.employer?.id
    if (employerId) {
      const startOfToday = new Date()
      startOfToday.setUTCHours(0, 0, 0, 0)
      const viewedToday = await prisma.candidateProfileView.findFirst({
        where: { employerId, applicationId: params.id, viewedAt: { gte: startOfToday } },
      })
      if (!viewedToday) {
        await prisma.candidateProfileView.create({
          data: { employerId, applicationId: params.id, jobTitle: agreement.jobTitle, candidateName: agreement.candidateName },
        })
      }
    }
  }

  return NextResponse.json({ ...application, agreementRequired: false })
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
    include: {
      job: true,
      jobSeeker: { include: { user: { select: { name: true, email: true } } } },
      learner: { include: { user: { select: { name: true, email: true } } } },
    },
  })

  const candidateUserId = app?.jobSeeker?.userId || app?.learner?.userId
  const candidateUser = app?.jobSeeker?.user || app?.learner?.user
  if (candidateUserId) {
    await prisma.notification.create({
      data: { userId: candidateUserId, title: "Application Update", body: `Your application for "${app?.job.title}" is now ${status}`, type: "APPLICATION_UPDATE", link: `/${app?.jobSeeker ? "jobseeker" : "learner"}/applications/${params.id}` },
    })
  }

  if (candidateUser?.email && app) {
    const link = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${app.jobSeeker ? "jobseeker" : "learner"}/applications/${params.id}`
    const emailContent = applicationStatusEmailTemplate({ name: candidateUser.name || "there", jobTitle: app.job.title, company: app.job.company, status, link })
    await sendEmail({ to: candidateUser.email, ...emailContent })
    await logEmail({ learnerId: app.learner?.id || null, toEmail: candidateUser.email, subject: emailContent.subject, body: emailContent.html, category: "APPLICATION_STATUS", sentById: session.user.id })
  }

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "UPDATE", entity: "Application", entityId: params.id, detail: `Status changed to ${status}` },
  })

  return NextResponse.json(application)
}
