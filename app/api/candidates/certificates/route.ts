import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { name, issuer, issueDate, fileUrl } = body

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

  const certificate = await prisma.certificate.create({
    data: {
      ...profileField,
      name, issuer,
      issueDate: issueDate ? new Date(issueDate) : null,
      fileUrl,
    },
  })

  return NextResponse.json(certificate, { status: 201 })
}

export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  await prisma.certificate.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
