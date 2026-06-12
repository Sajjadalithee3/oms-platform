import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateJobSeekerCompletion, calculateLearnerCompletion } from "@/lib/profile-completion"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role === "JOB_SEEKER") {
    const profile = await prisma.jobSeekerProfile.findUnique({
      where: { userId: session.user.id },
      include: { experiences: true, educations: true, certificates: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }
    return NextResponse.json(profile)
  }

  if (session.user.role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({
      where: { userId: session.user.id },
      include: { experiences: true, educations: true, certificates: true, provider: true, cohort: true },
    })
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }
    return NextResponse.json(profile)
  }

  return NextResponse.json({ error: "Invalid role" }, { status: 403 })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  if (session.user.role === "JOB_SEEKER") {
    const { headline, bio, phone, location, skills, desiredRoles, desiredSalaryMin, desiredSalaryMax, desiredLocation, remotePreference, linkedIn, github, portfolio, cvFile, cvText } = body

    const profile = await prisma.jobSeekerProfile.update({
      where: { userId: session.user.id },
      data: {
        headline, bio, phone, location,
        skills: skills ? JSON.stringify(skills) : undefined,
        desiredRoles: desiredRoles ? JSON.stringify(desiredRoles) : undefined,
        desiredSalaryMin, desiredSalaryMax, desiredLocation, remotePreference,
        linkedIn, github, portfolio, cvFile, cvText,
      },
      include: { experiences: true, educations: true, certificates: true },
    })

    const completion = calculateJobSeekerCompletion(profile)
    await prisma.jobSeekerProfile.update({
      where: { id: profile.id },
      data: { profileComplete: completion.percentage },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "JobSeekerProfile",
        entityId: profile.id,
        detail: "Profile updated",
      },
    })

    return NextResponse.json({ ...profile, profileComplete: completion.percentage, incomplete: completion.incomplete })
  }

  if (session.user.role === "LEARNER") {
    const { headline, bio, phone, location, skills, desiredRoles, desiredSalaryMin, desiredSalaryMax, desiredLocation, remotePreference, linkedIn, github, portfolio, cvFile, cvText } = body

    const profile = await prisma.learnerProfile.update({
      where: { userId: session.user.id },
      data: {
        headline, bio, phone, location,
        skills: skills ? JSON.stringify(skills) : undefined,
        desiredRoles: desiredRoles ? JSON.stringify(desiredRoles) : undefined,
        desiredSalaryMin, desiredSalaryMax, desiredLocation, remotePreference,
        linkedIn, github, portfolio, cvFile, cvText,
      },
      include: { experiences: true, educations: true, certificates: true },
    })

    const completion = calculateLearnerCompletion(profile)
    await prisma.learnerProfile.update({
      where: { id: profile.id },
      data: { profileComplete: completion.percentage },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "LearnerProfile",
        entityId: profile.id,
        detail: "Profile updated",
      },
    })

    return NextResponse.json({ ...profile, profileComplete: completion.percentage, incomplete: completion.incomplete })
  }

  return NextResponse.json({ error: "Invalid role" }, { status: 403 })
}
