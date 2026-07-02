import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const learners = await prisma.learnerProfile.findMany({
    include: {
      user: { select: { name: true, email: true, lastLoginAt: true } },
      provider: { select: { organisationName: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(learners)
}
