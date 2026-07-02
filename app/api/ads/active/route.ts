import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const ads = await prisma.advertisement.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
  })

  let learnerProviderId: string | null = null
  if (session.user.role === "LEARNER") {
    const learnerProfile = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } })
    learnerProviderId = learnerProfile?.providerId || null
  }

  const visible = ads.filter((ad) => {
    if (ad.createdByRole === "SUPER_ADMIN") return true
    if (ad.createdByRole === "TRAINING_PROVIDER") {
      return session.user.role === "LEARNER" && learnerProviderId === ad.providerId
    }
    return false
  })

  return NextResponse.json(visible)
}
