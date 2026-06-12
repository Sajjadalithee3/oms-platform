import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user.role

  if (role === "SUPER_ADMIN" || role === "INTERNAL_STAFF") {
    const [providers, employers, learners, jobSeekers, jobs, applications, matches, activeJobs] = await Promise.all([
      prisma.providerProfile.count(),
      prisma.employerProfile.count(),
      prisma.learnerProfile.count(),
      prisma.jobSeekerProfile.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.jobMatch.count(),
      prisma.job.count({ where: { status: "ACTIVE" } }),
    ])

    const jobsBySector = await prisma.job.groupBy({ by: ["sector"], _count: true })
    const applicationsByStatus = await prisma.application.groupBy({ by: ["status"], _count: true })

    const recentAudit = await prisma.auditLog.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    return NextResponse.json({
      providers, employers, learners, jobSeekers, jobs, applications, matches, activeJobs,
      jobsBySector: jobsBySector.map((j) => ({ sector: j.sector, count: j._count })),
      applicationsByStatus: applicationsByStatus.map((a) => ({ status: a.status, count: a._count })),
      recentAudit,
    })
  }

  if (role === "EMPLOYER") {
    const employer = await prisma.employerProfile.findUnique({ where: { userId: session.user.id } })
    if (!employer) return NextResponse.json({})
    const [jobs, applications, interviews] = await Promise.all([
      prisma.job.count({ where: { employerId: employer.id } }),
      prisma.application.count({ where: { job: { employerId: employer.id } } }),
      prisma.interview.count({ where: { employerId: employer.id } }),
    ])
    return NextResponse.json({ jobs, applications, interviews })
  }

  if (role === "TRAINING_PROVIDER") {
    const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
    if (!provider) return NextResponse.json({})
    const learners = await prisma.learnerProfile.findMany({ where: { providerId: provider.id } })
    const ragBreakdown = { GREEN: 0, AMBER: 0, RED: 0 }
    let ms1 = 0, ms2 = 0, ms3 = 0
    for (const l of learners) {
      const rag = l.ragStatus as keyof typeof ragBreakdown
      if (ragBreakdown[rag] !== undefined) ragBreakdown[rag]++
      if (l.ms1Achieved) ms1++
      if (l.ms2Achieved) ms2++
      if (l.ms3Achieved) ms3++
    }
    return NextResponse.json({ totalLearners: learners.length, ragBreakdown, ms1, ms2, ms3 })
  }

  return NextResponse.json({})
}
