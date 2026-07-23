import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { fetchReedJobDescription } from "@/lib/scraper/reed"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      employer: { select: { companyName: true, companyLogo: true, industry: true, location: true, website: true, description: true } },
      _count: { select: { applications: true } },
    },
  })

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Reed's search feed only stores a truncated description preview. Fetch the
  // full text on first view and cache it, so this only costs one extra API
  // call per job ever actually opened, not per scrape run.
  if (job.sourceType === "REED" && !job.descriptionFull && job.externalId) {
    const board = job.sourceBoardId ? await prisma.jobBoard.findUnique({ where: { id: job.sourceBoardId } }) : null
    if (board?.apiKey) {
      const fullDescription = await fetchReedJobDescription(board.apiKey, job.externalId)
      if (fullDescription) {
        job = await prisma.job.update({
          where: { id: job.id },
          data: { description: fullDescription, descriptionFull: true },
          include: {
            employer: { select: { companyName: true, companyLogo: true, industry: true, location: true, website: true, description: true } },
            _count: { select: { applications: true } },
          },
        })
      }
    }
  }

  let matchData = null
  let hasApplied = false

  if (session.user.role === "JOB_SEEKER") {
    const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: session.user.id } })
    if (profile) {
      const match = await prisma.jobMatch.findFirst({ where: { jobId: job.id, jobSeekerId: profile.id } })
      if (match) matchData = match
      const app = await prisma.application.findFirst({ where: { jobId: job.id, jobSeekerId: profile.id } })
      hasApplied = !!app
    }
  } else if (session.user.role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } })
    if (profile) {
      const match = await prisma.jobMatch.findFirst({ where: { jobId: job.id, learnerId: profile.id } })
      if (match) matchData = match
      const app = await prisma.application.findFirst({ where: { jobId: job.id, learnerId: profile.id } })
      hasApplied = !!app
    }
  }

  return NextResponse.json({ ...job, matchData, hasApplied })
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const allowedRoles = ["SUPER_ADMIN", "INTERNAL_STAFF", "EMPLOYER"]
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (session.user.role === "EMPLOYER") {
    const employer = await prisma.employerProfile.findUnique({ where: { userId: session.user.id } })
    const existingJob = await prisma.job.findUnique({ where: { id: params.id } })
    if (!employer || existingJob?.employerId !== employer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const body = await request.json()
  const job = await prisma.job.update({ where: { id: params.id }, data: body })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "UPDATE", entity: "Job", entityId: job.id, detail: "Job updated" },
  })

  return NextResponse.json(job)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const allowedRoles = ["SUPER_ADMIN", "INTERNAL_STAFF", "EMPLOYER", "TRAINING_PROVIDER"]
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const job = await prisma.job.findUnique({ where: { id: params.id } })
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

  if (session.user.role === "EMPLOYER") {
    const employer = await prisma.employerProfile.findUnique({ where: { userId: session.user.id } })
    if (!employer || job.employerId !== employer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const apps = await prisma.application.findMany({ where: { jobId: params.id }, select: { id: true } })
  const appIds = apps.map(a => a.id)
  if (appIds.length > 0) {
    await prisma.interview.deleteMany({ where: { applicationId: { in: appIds } } })
    await prisma.message.deleteMany({ where: { applicationId: { in: appIds } } })
    await prisma.application.deleteMany({ where: { jobId: params.id } })
  }
  await prisma.jobMatch.deleteMany({ where: { jobId: params.id } })
  await prisma.job.delete({ where: { id: params.id } })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "DELETE", entity: "Job", entityId: params.id, detail: `Job "${job.title}" permanently deleted` },
  })

  return NextResponse.json({ success: true })
}
