import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const cohorts = await prisma.cohort.findMany({
    where: { providerId: provider.id },
    include: { course: true, _count: { select: { learners: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(cohorts)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const body = await request.json()
  const { courseId, name, startDate, endDate, expectedLearners } = body

  const cohort = await prisma.cohort.create({
    data: {
      providerId: provider.id, courseId, name,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      expectedLearners: expectedLearners || 0,
    },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "Cohort", entityId: cohort.id, detail: `Cohort "${name}" created` },
  })

  return NextResponse.json(cohort, { status: 201 })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { id, name, startDate, endDate, expectedLearners } = body

  const cohort = await prisma.cohort.update({
    where: { id },
    data: { name, startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null, expectedLearners },
  })

  return NextResponse.json(cohort)
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  await prisma.cohort.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
