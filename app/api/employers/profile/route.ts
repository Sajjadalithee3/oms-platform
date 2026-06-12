import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "EMPLOYER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const profile = await prisma.employerProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  return NextResponse.json(profile)
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "EMPLOYER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { companyName, companyLogo, industry, companySize, location, website, description, linkedIn, twitter } = body

  const profile = await prisma.employerProfile.update({
    where: { userId: session.user.id },
    data: { companyName, companyLogo, industry, companySize, location, website, description, linkedIn, twitter },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "EmployerProfile",
      entityId: profile.id,
      detail: "Employer profile updated",
    },
  })

  return NextResponse.json(profile)
}
