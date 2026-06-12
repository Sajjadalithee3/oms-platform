import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runMatchingForCandidate } from "@/lib/matching"
import { prisma } from "@/lib/prisma"

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const jsProfile = await prisma.jobSeekerProfile.findUnique({ where: { id: params.id } })
  const lProfile = await prisma.learnerProfile.findUnique({ where: { id: params.id } })

  if (jsProfile) {
    await runMatchingForCandidate(params.id, "JOB_SEEKER")
  } else if (lProfile) {
    await runMatchingForCandidate(params.id, "LEARNER")
  } else {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 })
  }

  const matches = await prisma.jobMatch.findMany({
    where: jsProfile ? { jobSeekerId: params.id } : { learnerId: params.id },
    include: { job: { select: { title: true, company: true } } },
    orderBy: { matchScore: "desc" },
  })

  return NextResponse.json({ matchCount: matches.length, matches })
}
