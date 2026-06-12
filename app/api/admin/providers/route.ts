import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const providers = await prisma.providerProfile.findMany({
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { learners: true, courses: true, cohorts: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(providers)
}
