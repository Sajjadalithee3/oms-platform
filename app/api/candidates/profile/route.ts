import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateJobSeekerCompletion, calculateLearnerCompletion } from "@/lib/profile-completion"
import { runMatchingForCandidate } from "@/lib/matching"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const targetUserId = searchParams.get("userId")

  if (targetUserId) {
    if (!["SUPER_ADMIN", "INTERNAL_STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) return NextResponse.json({ error: "Candidate not found" }, { status: 404 })

    if (targetUser.role === "JOB_SEEKER") {
      const profile = await prisma.jobSeekerProfile.findUnique({
        where: { userId: targetUserId },
        include: { user: { select: { name: true, email: true } }, experiences: true, educations: true },
      })
      if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
      return NextResponse.json({
        id: profile.id, type: "JOB_SEEKER", user: profile.user,
        location: profile.location, skills: profile.skills, phone: profile.phone,
        profileComplete: profile.profileComplete, bio: profile.bio,
        desiredSectors: profile.desiredSectors,
        desiredSalaryMin: profile.desiredSalaryMin, desiredSalaryMax: profile.desiredSalaryMax,
        experience: profile.experiences, education: profile.educations,
      })
    }

    if (targetUser.role === "LEARNER") {
      const profile = await prisma.learnerProfile.findUnique({
        where: { userId: targetUserId },
        include: { user: { select: { name: true, email: true } }, experiences: true, educations: true, provider: { select: { organisationName: true } } },
      })
      if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
      return NextResponse.json({
        id: profile.id, type: "LEARNER", user: profile.user,
        location: profile.location, skills: profile.skills, phone: profile.phone,
        profileComplete: profile.profileComplete, ragStatus: profile.ragStatus,
        courseSector: profile.courseSector, provider: profile.provider.organisationName,
        bio: profile.bio, desiredSectors: profile.desiredSectors,
        desiredSalaryMin: profile.desiredSalaryMin, desiredSalaryMax: profile.desiredSalaryMax,
        experience: profile.experiences, education: profile.educations,
      })
    }

    return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
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
    const { headline, bio, phone, location, skills, desiredSectors, employmentType, desiredSalaryMin, desiredSalaryMax, desiredLocation, remotePreference, linkedIn, github, portfolio, cvFile, cvText } = body

    const profile = await prisma.jobSeekerProfile.update({
      where: { userId: session.user.id },
      data: {
        headline, bio, phone, location,
        skills: skills ? JSON.stringify(skills) : undefined,
        desiredSectors: desiredSectors ? JSON.stringify(desiredSectors) : undefined,
        employmentType,
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

    if (desiredSectors || skills) {
      await runMatchingForCandidate(profile.id, "JOB_SEEKER")
    }

    return NextResponse.json({ ...profile, profileComplete: completion.percentage, incomplete: completion.incomplete })
  }

  if (session.user.role === "LEARNER") {
    const { headline, bio, phone, location, skills, desiredSectors, employmentType, desiredSalaryMin, desiredSalaryMax, desiredLocation, remotePreference, linkedIn, github, portfolio, cvFile, cvText } = body

    const profile = await prisma.learnerProfile.update({
      where: { userId: session.user.id },
      data: {
        headline, bio, phone, location,
        skills: skills ? JSON.stringify(skills) : undefined,
        desiredSectors: desiredSectors ? JSON.stringify(desiredSectors) : undefined,
        employmentType,
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

    if (desiredSectors || skills) {
      await runMatchingForCandidate(profile.id, "LEARNER")
    }

    return NextResponse.json({ ...profile, profileComplete: completion.percentage, incomplete: completion.incomplete })
  }

  return NextResponse.json({ error: "Invalid role" }, { status: 403 })
}
