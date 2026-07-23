import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { runMatchingForJob } from "@/lib/matching"
import { inferSector } from "@/lib/scraper/runner"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sector = searchParams.get("sector")
  const status = searchParams.get("status")
  const source = searchParams.get("source")
  const search = searchParams.get("search")

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  else where.status = "ACTIVE"
  if (source) where.sourceType = source
  if (search) where.title = { contains: search }

  if (session.user.role === "LEARNER") {
    const learner = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } })
    if (learner) {
      let desiredSectorList: string[] = []
      try { desiredSectorList = JSON.parse(learner.desiredSectors || "[]") } catch { desiredSectorList = [] }
      if (desiredSectorList.length > 0) where.sector = { in: desiredSectorList }
    }
  } else if (session.user.role === "JOB_SEEKER") {
    const jobSeeker = await prisma.jobSeekerProfile.findUnique({ where: { userId: session.user.id } })
    if (jobSeeker) {
      let desiredSectorList: string[] = []
      try { desiredSectorList = JSON.parse(jobSeeker.desiredSectors || "[]") } catch { desiredSectorList = [] }
      if (desiredSectorList.length > 0) where.sector = { in: desiredSectorList }
    }
  } else if (session.user.role === "EMPLOYER") {
    const employer = await prisma.employerProfile.findUnique({ where: { userId: session.user.id } })
    if (employer) where.employerId = employer.id
  }

  if (sector) where.sector = sector

  const jobs = await prisma.job.findMany({
    where,
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(jobs)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "EMPLOYER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const employer = await prisma.employerProfile.findUnique({ where: { userId: session.user.id } })
  if (!employer && session.user.role === "EMPLOYER") return NextResponse.json({ error: "Employer profile not found" }, { status: 404 })

  const body = await request.json()
  const { title, sector, requiredSkills, location, salaryMin, salaryMax, jobType, isRemote, description, deadline } = body

  const job = await prisma.job.create({
    data: {
      title,
      company: employer?.companyName || "Unknown",
      sector: sector || inferSector(title, description || ""),
      requiredSkills: JSON.stringify(requiredSkills || []),
      location: location || "",
      salaryMin: salaryMin ? parseInt(salaryMin) : null,
      salaryMax: salaryMax ? parseInt(salaryMax) : null,
      jobType,
      isRemote: isRemote || false,
      description: description || "",
      deadline: deadline ? new Date(deadline) : null,
      employerId: employer?.id,
      sourceType: "INTERNAL",
    },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "Job", entityId: job.id, detail: `Job "${title}" posted` },
  })

  await runMatchingForJob(job.id)

  return NextResponse.json(job, { status: 201 })
}
