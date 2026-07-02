import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INTERNAL_STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  if (user.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot edit super admin" }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, newPassword, role, isActive } = body

  if (email && email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (email !== undefined) data.email = email
  if (role !== undefined) data.role = role
  if (isActive !== undefined) data.isActive = isActive
  if (newPassword) {
    if (newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    data.password = await bcrypt.hash(newPassword, 10)
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "User",
      entityId: params.id,
      detail: `Admin edited user "${updated.name}" (${updated.email}): ${Object.keys(data).filter(k => k !== "password").join(", ")}${newPassword ? ", password reset" : ""}`,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  if (user.id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
  }
  if (user.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot delete super admin accounts" }, { status: 403 })
  }

  // Cascade delete all related data based on role
  if (user.role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({ where: { userId: user.id } })
    if (profile) {
      const apps = await prisma.application.findMany({ where: { learnerId: profile.id }, select: { id: true } })
      const appIds = apps.map(a => a.id)
      if (appIds.length > 0) {
        await prisma.interview.deleteMany({ where: { applicationId: { in: appIds } } })
        await prisma.message.deleteMany({ where: { applicationId: { in: appIds } } })
        await prisma.application.deleteMany({ where: { learnerId: profile.id } })
      }
      await prisma.jobMatch.deleteMany({ where: { learnerId: profile.id } })
      await prisma.experience.deleteMany({ where: { learnerId: profile.id } })
      await prisma.education.deleteMany({ where: { learnerId: profile.id } })
      await prisma.certificate.deleteMany({ where: { learnerId: profile.id } })
      await prisma.learnerProfile.delete({ where: { id: profile.id } })
    }
  } else if (user.role === "JOB_SEEKER") {
    const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: user.id } })
    if (profile) {
      const apps = await prisma.application.findMany({ where: { jobSeekerId: profile.id }, select: { id: true } })
      const appIds = apps.map(a => a.id)
      if (appIds.length > 0) {
        await prisma.interview.deleteMany({ where: { applicationId: { in: appIds } } })
        await prisma.message.deleteMany({ where: { applicationId: { in: appIds } } })
        await prisma.application.deleteMany({ where: { jobSeekerId: profile.id } })
      }
      await prisma.jobMatch.deleteMany({ where: { jobSeekerId: profile.id } })
      await prisma.experience.deleteMany({ where: { jobSeekerId: profile.id } })
      await prisma.education.deleteMany({ where: { jobSeekerId: profile.id } })
      await prisma.certificate.deleteMany({ where: { jobSeekerId: profile.id } })
      await prisma.jobSeekerProfile.delete({ where: { id: profile.id } })
    }
  } else if (user.role === "EMPLOYER") {
    const profile = await prisma.employerProfile.findUnique({ where: { userId: user.id } })
    if (profile) {
      const jobs = await prisma.job.findMany({ where: { employerId: profile.id }, select: { id: true } })
      const jobIds = jobs.map(j => j.id)
      if (jobIds.length > 0) {
        const apps = await prisma.application.findMany({ where: { jobId: { in: jobIds } }, select: { id: true } })
        const appIds = apps.map(a => a.id)
        if (appIds.length > 0) {
          await prisma.interview.deleteMany({ where: { applicationId: { in: appIds } } })
          await prisma.message.deleteMany({ where: { applicationId: { in: appIds } } })
          await prisma.application.deleteMany({ where: { jobId: { in: jobIds } } })
        }
        await prisma.jobMatch.deleteMany({ where: { jobId: { in: jobIds } } })
        await prisma.job.deleteMany({ where: { employerId: profile.id } })
      }
      await prisma.interview.deleteMany({ where: { employerId: profile.id } })
      await prisma.employerProfile.delete({ where: { id: profile.id } })
    }
  } else if (user.role === "TRAINING_PROVIDER") {
    const profile = await prisma.providerProfile.findUnique({ where: { userId: user.id } })
    if (profile) {
      await prisma.learnerProfile.updateMany({ where: { providerId: profile.id }, data: { providerId: profile.id } })
      await prisma.providerProfile.delete({ where: { id: profile.id } })
    }
  }

  await prisma.notification.deleteMany({ where: { userId: user.id } })
  await prisma.auditLog.deleteMany({ where: { userId: user.id } })
  await prisma.user.delete({ where: { id: user.id } })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "DELETE",
      entity: "User",
      entityId: params.id,
      detail: `User "${user.name}" (${user.email}, ${user.role}) permanently deleted by admin`,
    },
  })

  return NextResponse.json({ success: true })
}
