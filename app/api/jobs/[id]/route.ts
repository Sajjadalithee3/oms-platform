import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      employer: { select: { companyName: true, companyLogo: true, location: true } },
      applications: { include: { jobSeeker: { include: { user: { select: { name: true } } } }, learner: { include: { user: { select: { name: true } } } } } },
      matches: true,
      _count: { select: { applications: true } },
    },
  })

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(job)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  const job = await prisma.job.update({ where: { id: params.id }, data: { status: "CLOSED" } })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "DELETE", entity: "Job", entityId: job.id, detail: "Job closed" },
  })

  return NextResponse.json(job)
}
