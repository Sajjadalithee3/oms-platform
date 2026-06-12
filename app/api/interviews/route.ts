import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const where: Record<string, unknown> = {}

  if (session.user.role === "EMPLOYER") {
    const employer = await prisma.employerProfile.findUnique({ where: { userId: session.user.id } })
    if (employer) where.employerId = employer.id
  } else if (session.user.role === "JOB_SEEKER") {
    const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: session.user.id } })
    if (profile) where.application = { jobSeekerId: profile.id }
  } else if (session.user.role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } })
    if (profile) where.application = { learnerId: profile.id }
  }

  const interviews = await prisma.interview.findMany({
    where,
    include: {
      application: {
        include: {
          job: { select: { title: true, company: true } },
          jobSeeker: { include: { user: { select: { name: true } } } },
          learner: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(interviews)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "EMPLOYER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only employers can schedule interviews" }, { status: 403 })
  }

  const employer = await prisma.employerProfile.findUnique({ where: { userId: session.user.id } })
  if (!employer) return NextResponse.json({ error: "Employer profile not found" }, { status: 404 })

  const body = await request.json()
  const { applicationId, proposedSlots, location, meetingLink, notes } = body

  const interview = await prisma.interview.create({
    data: {
      applicationId,
      employerId: employer.id,
      proposedSlots: JSON.stringify(proposedSlots || []),
      location,
      meetingLink,
      notes,
      status: "PENDING",
    },
  })

  await prisma.application.update({ where: { id: applicationId }, data: { status: "INTERVIEW" } })

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true, jobSeeker: true, learner: true },
  })
  const candidateUserId = app?.jobSeeker?.userId || app?.learner?.userId
  if (candidateUserId) {
    await prisma.notification.create({
      data: { userId: candidateUserId, title: "Interview Scheduled", body: `Interview for "${app?.job.title}" — please select a time slot`, type: "INTERVIEW", link: `/${app?.jobSeeker ? "jobseeker" : "learner"}/applications/${applicationId}` },
    })
  }

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "Interview", entityId: interview.id, detail: `Interview scheduled for application ${applicationId}` },
  })

  return NextResponse.json(interview, { status: 201 })
}
