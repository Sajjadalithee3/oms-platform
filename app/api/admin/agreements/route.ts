import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INTERNAL_STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const agreements = await prisma.employerAgreement.findMany({
    include: { employer: { select: { companyName: true, user: { select: { email: true } } } } },
    orderBy: { agreedAt: "desc" },
  })

  return NextResponse.json(agreements)
}
