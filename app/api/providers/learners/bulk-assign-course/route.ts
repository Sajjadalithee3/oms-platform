import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { learnerIds, courseId } = body as { learnerIds: string[]; courseId: string }
  if (!learnerIds || !Array.isArray(learnerIds) || learnerIds.length === 0 || !courseId) {
    return NextResponse.json({ error: "learnerIds and courseId are required" }, { status: 400 })
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  if (session.user.role === "TRAINING_PROVIDER") {
    const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
    if (!provider || provider.id !== course.providerId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const result = await prisma.learnerProfile.updateMany({
    where: { id: { in: learnerIds }, providerId: course.providerId },
    data: { courseName: course.name, courseSector: course.sector },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "UPDATE", entity: "LearnerProfile", entityId: course.id, detail: `Assigned course "${course.name}" to ${result.count} learner(s)` },
  })

  return NextResponse.json({ updated: result.count })
}
