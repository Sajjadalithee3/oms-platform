import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { institution, degree, field, startDate, endDate, current } = body

  let profileField: Record<string, string> = {}
  if (session.user.role === "JOB_SEEKER") {
    const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    profileField = { jobSeekerId: profile.id }
  } else if (session.user.role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    profileField = { learnerId: profile.id }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const education = await prisma.education.create({
    data: {
      ...profileField,
      institution, degree, field,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      current: current || false,
    },
  })

  return NextResponse.json(education, { status: 201 })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { id, institution, degree, field, startDate, endDate, current } = body

  const education = await prisma.education.update({
    where: { id },
    data: {
      institution, degree, field,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      current: current || false,
    },
  })

  return NextResponse.json(education)
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  await prisma.education.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
