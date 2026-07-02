import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

async function verifyProviderOwnership(userId: string, learnerId: string) {
  const provider = await prisma.providerProfile.findUnique({ where: { userId } })
  if (!provider) return null
  const learner = await prisma.learnerProfile.findUnique({
    where: { id: learnerId },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (!learner || learner.providerId !== provider.id) return null
  return { provider, learner }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const ownership = await verifyProviderOwnership(session.user.id, params.id)
  if (!ownership) return NextResponse.json({ error: "Learner not found or not yours" }, { status: 404 })

  const body = await request.json()
  const { name, email, newPassword, cohortId, courseName, courseSector, ragStatus, ms1Achieved, ms2Achieved, ms3Achieved } = body

  if (email && email !== ownership.learner.user.email) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const userUpdate: Record<string, unknown> = {}
  if (name !== undefined) userUpdate.name = name
  if (email !== undefined) userUpdate.email = email
  if (newPassword) {
    if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    userUpdate.password = await bcrypt.hash(newPassword, 10)
  }

  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({ where: { id: ownership.learner.userId }, data: userUpdate })
  }

  const profileUpdate: Record<string, unknown> = {}
  if (cohortId !== undefined) profileUpdate.cohortId = cohortId || null
  if (courseName !== undefined) profileUpdate.courseName = courseName || null
  if (courseSector !== undefined) profileUpdate.courseSector = courseSector || null
  if (ragStatus !== undefined) profileUpdate.ragStatus = ragStatus
  if (ms1Achieved !== undefined) {
    profileUpdate.ms1Achieved = ms1Achieved
    profileUpdate.ms1Date = ms1Achieved ? new Date() : null
  }
  if (ms2Achieved !== undefined) {
    profileUpdate.ms2Achieved = ms2Achieved
    profileUpdate.ms2Date = ms2Achieved ? new Date() : null
  }
  if (ms3Achieved !== undefined) {
    profileUpdate.ms3Achieved = ms3Achieved
    profileUpdate.ms3Date = ms3Achieved ? new Date() : null
  }

  const learner = await prisma.learnerProfile.update({
    where: { id: params.id },
    data: profileUpdate,
    include: { user: { select: { name: true, email: true } }, cohort: true },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "LearnerProfile",
      entityId: params.id,
      detail: `Learner "${learner.user.name}" updated by provider`,
    },
  })

  return NextResponse.json(learner)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const ownership = await verifyProviderOwnership(session.user.id, params.id)
  if (!ownership) return NextResponse.json({ error: "Learner not found or not yours" }, { status: 404 })

  const learnerId = params.id
  const userId = ownership.learner.userId
  const learnerName = ownership.learner.user.name

  const apps = await prisma.application.findMany({ where: { learnerId }, select: { id: true } })
  const appIds = apps.map(a => a.id)
  if (appIds.length > 0) {
    await prisma.interview.deleteMany({ where: { applicationId: { in: appIds } } })
    await prisma.message.deleteMany({ where: { applicationId: { in: appIds } } })
    await prisma.application.deleteMany({ where: { learnerId } })
  }
  await prisma.jobMatch.deleteMany({ where: { learnerId } })
  await prisma.experience.deleteMany({ where: { learnerId } })
  await prisma.education.deleteMany({ where: { learnerId } })
  await prisma.certificate.deleteMany({ where: { learnerId } })
  await prisma.learnerProfile.delete({ where: { id: learnerId } })
  await prisma.notification.deleteMany({ where: { userId } })
  await prisma.auditLog.deleteMany({ where: { userId } })
  await prisma.user.delete({ where: { id: userId } })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "LearnerProfile",
      entityId: learnerId,
      detail: `Learner "${learnerName}" deleted by provider`,
    },
  })

  return NextResponse.json({ success: true })
}
