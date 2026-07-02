import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const allowedRoles = ["SUPER_ADMIN", "INTERNAL_STAFF", "EMPLOYER"]
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { jobIds } = await request.json() as { jobIds: string[] }
  if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
    return NextResponse.json({ error: "No job IDs provided" }, { status: 400 })
  }

  if (jobIds.length > 500) {
    return NextResponse.json({ error: "Maximum 500 jobs per batch" }, { status: 400 })
  }

  let where: Record<string, unknown> = { id: { in: jobIds } }
  if (session.user.role === "EMPLOYER") {
    const employer = await prisma.employerProfile.findUnique({ where: { userId: session.user.id } })
    if (!employer) return NextResponse.json({ error: "Employer not found" }, { status: 404 })
    where = { id: { in: jobIds }, employerId: employer.id }
  }

  const jobs = await prisma.job.findMany({ where, select: { id: true, title: true } })
  const validIds = jobs.map(j => j.id)

  if (validIds.length === 0) {
    return NextResponse.json({ error: "No matching jobs found" }, { status: 404 })
  }

  const apps = await prisma.application.findMany({ where: { jobId: { in: validIds } }, select: { id: true } })
  const appIds = apps.map(a => a.id)

  if (appIds.length > 0) {
    await prisma.interview.deleteMany({ where: { applicationId: { in: appIds } } })
    await prisma.message.deleteMany({ where: { applicationId: { in: appIds } } })
    await prisma.application.deleteMany({ where: { jobId: { in: validIds } } })
  }
  await prisma.jobMatch.deleteMany({ where: { jobId: { in: validIds } } })
  await prisma.job.deleteMany({ where: { id: { in: validIds } } })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "Job",
      entityId: validIds.join(","),
      detail: `Bulk deleted ${validIds.length} jobs`,
    },
  })

  return NextResponse.json({ success: true, deleted: validIds.length })
}
