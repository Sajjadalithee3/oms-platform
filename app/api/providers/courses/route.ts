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

  const courses = await prisma.course.findMany({
    where: { providerId: provider.id },
    include: { cohorts: { include: { _count: { select: { learners: true } } } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(courses)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const body = await request.json()
  const { name, sector, requiredSkills, duration, description } = body

  const course = await prisma.course.create({
    data: {
      providerId: provider.id,
      name, sector,
      requiredSkills: requiredSkills ? JSON.stringify(requiredSkills) : "[]",
      duration, description,
    },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "Course", entityId: course.id, detail: `Course "${name}" created` },
  })

  return NextResponse.json(course, { status: 201 })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { id, name, sector, requiredSkills, duration, description, isActive } = body

  const course = await prisma.course.update({
    where: { id },
    data: { name, sector, requiredSkills: requiredSkills ? JSON.stringify(requiredSkills) : undefined, duration, description, isActive },
  })

  return NextResponse.json(course)
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  await prisma.course.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
