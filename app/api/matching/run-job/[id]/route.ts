import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runMatchingForJob } from "@/lib/matching"
import { prisma } from "@/lib/prisma"

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await runMatchingForJob(params.id)

  const matches = await prisma.jobMatch.findMany({
    where: { jobId: params.id },
    include: {
      jobSeeker: { include: { user: { select: { name: true } } } },
      learner: { include: { user: { select: { name: true } } } },
    },
    orderBy: { matchScore: "desc" },
  })

  return NextResponse.json({ matchCount: matches.length, matches })
}
