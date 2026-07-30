import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INTERNAL_STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const employer = await prisma.employerProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { jobs: true, interviews: true } },
    },
  })
  if (!employer) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const agreements = await prisma.employerAgreement.findMany({
    where: { employerId: params.id },
    orderBy: { agreedAt: "desc" },
  })

  const views = await prisma.candidateProfileView.findMany({
    where: { employerId: params.id },
    orderBy: { viewedAt: "desc" },
  })

  const activity = agreements.map((a) => {
    const candidateViews = views.filter((v) => v.applicationId === a.applicationId)
    return {
      applicationId: a.applicationId,
      candidateName: a.candidateName,
      jobTitle: a.jobTitle,
      agreedAt: a.agreedAt,
      viewCount: candidateViews.length,
      lastViewedAt: candidateViews[0]?.viewedAt || a.agreedAt,
    }
  })

  return NextResponse.json({ employer, activity })
}
