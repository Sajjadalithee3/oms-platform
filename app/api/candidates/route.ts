import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "INTERNAL_STAFF", "EMPLOYER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  const candidates: Array<Record<string, unknown>> = []

  if (!type || type === "jobseeker") {
    const seekers = await prisma.jobSeekerProfile.findMany({
      include: { user: { select: { name: true, email: true } } },
    })
    for (const s of seekers) {
      candidates.push({ id: s.id, type: "JOB_SEEKER", name: s.user.name, email: s.user.email, location: s.location, skills: s.skills, profileComplete: s.profileComplete, userId: s.userId })
    }
  }

  if (!type || type === "learner") {
    const learners = await prisma.learnerProfile.findMany({
      include: { user: { select: { name: true, email: true } }, provider: { select: { organisationName: true } } },
    })
    for (const l of learners) {
      candidates.push({ id: l.id, type: "LEARNER", name: l.user.name, email: l.user.email, location: l.location, skills: l.skills, profileComplete: l.profileComplete, ragStatus: l.ragStatus, courseSector: l.courseSector, provider: l.provider.organisationName, userId: l.userId })
    }
  }

  return NextResponse.json(candidates)
}
