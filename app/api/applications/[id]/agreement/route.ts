import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "EMPLOYER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const employer = await prisma.employerProfile.findUnique({ where: { userId: session.user.id } })
  if (!employer) return NextResponse.json({ error: "Employer profile not found" }, { status: 404 })

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      job: { select: { title: true, employerId: true } },
      jobSeeker: { include: { user: { select: { name: true } } } },
      learner: { include: { user: { select: { name: true } } } },
    },
  })
  if (!application || application.job.employerId !== employer.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const candidateName = application.jobSeeker?.user.name || application.learner?.user.name || "Candidate"

  const agreement = await prisma.employerAgreement.upsert({
    where: { applicationId: params.id },
    update: {},
    create: {
      employerId: employer.id,
      applicationId: params.id,
      jobTitle: application.job.title,
      candidateName,
    },
  })

  return NextResponse.json(agreement)
}
