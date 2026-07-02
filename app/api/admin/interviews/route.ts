import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INTERNAL_STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const interviews = await prisma.interview.findMany({
    include: {
      employer: {
        select: { companyName: true, companyLogo: true, industry: true },
      },
      application: {
        include: {
          job: { select: { title: true, company: true } },
          learner: {
            include: { user: { select: { name: true } } },
          },
          jobSeeker: {
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(interviews)
}
