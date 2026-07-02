import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const jobId = searchParams.get("jobId")

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (jobId) where.jobId = jobId

  if (session.user.role === "JOB_SEEKER") {
    const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.json([])
    where.jobSeekerId = profile.id
  } else if (session.user.role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.json([])
    where.learnerId = profile.id
  } else if (session.user.role === "EMPLOYER") {
    const employer = await prisma.employerProfile.findUnique({ where: { userId: session.user.id } })
    if (!employer) return NextResponse.json([])
    const employerJobs = await prisma.job.findMany({ where: { employerId: employer.id }, select: { id: true } })
    where.jobId = { in: employerJobs.map((j) => j.id) }
  } else if (session.user.role === "TRAINING_PROVIDER") {
    const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
    if (!provider) return NextResponse.json([])
    const learners = await prisma.learnerProfile.findMany({ where: { providerId: provider.id }, select: { id: true } })
    where.learnerId = { in: learners.map((l) => l.id) }
  } else if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INTERNAL_STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const applications = await prisma.application.findMany({
    where,
    include: {
      job: { select: { title: true, company: true, location: true, sector: true, employer: { select: { companyName: true } } } },
      jobSeeker: { include: { user: { select: { name: true, email: true } } } },
      learner: { include: { user: { select: { name: true, email: true } } } },
      _count: { select: { messages: true, interviews: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(applications)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { jobId, coverNote } = body

  let jobSeekerId: string | undefined
  let learnerId: string | undefined
  let matchScore: number | undefined

  if (session.user.role === "JOB_SEEKER") {
    const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    jobSeekerId = profile.id
    const match = await prisma.jobMatch.findFirst({ where: { jobId, jobSeekerId: profile.id } })
    if (match) matchScore = match.matchScore
  } else if (session.user.role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    learnerId = profile.id
    const match = await prisma.jobMatch.findFirst({ where: { jobId, learnerId: profile.id } })
    if (match) matchScore = match.matchScore
  } else {
    return NextResponse.json({ error: "Only candidates can apply" }, { status: 403 })
  }

  const existing = await prisma.application.findFirst({
    where: { jobId, ...(jobSeekerId ? { jobSeekerId } : { learnerId }) },
  })
  if (existing) return NextResponse.json({ error: "Already applied" }, { status: 409 })

  const application = await prisma.application.create({
    data: { jobId, coverNote, status: "APPLIED", jobSeekerId, learnerId, matchScore },
  })

  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { employer: true } })
  if (job?.employer) {
    await prisma.notification.create({
      data: { userId: job.employer.userId, title: "New Application", body: `New application for "${job.title}"`, type: "APPLICATION", link: `/employer/applications/${application.id}` },
    })
  }

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "Application", entityId: application.id, detail: `Applied to "${job?.title}"` },
  })

  return NextResponse.json(application, { status: 201 })
}
