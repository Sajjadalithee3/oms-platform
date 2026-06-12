import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { confirmedSlot, status, location, meetingLink, notes } = body

  const data: Record<string, unknown> = {}
  if (confirmedSlot) {
    data.confirmedSlot = new Date(confirmedSlot)
    data.status = "CONFIRMED"
  }
  if (status) data.status = status
  if (location !== undefined) data.location = location
  if (meetingLink !== undefined) data.meetingLink = meetingLink
  if (notes !== undefined) data.notes = notes

  const interview = await prisma.interview.update({ where: { id: params.id }, data })

  if (confirmedSlot) {
    const full = await prisma.interview.findUnique({
      where: { id: params.id },
      include: { employer: true, application: { include: { job: true } } },
    })
    if (full?.employer) {
      await prisma.notification.create({
        data: { userId: full.employer.userId, title: "Interview Confirmed", body: `Candidate confirmed interview for "${full.application.job.title}"`, type: "INTERVIEW", link: `/employer/interviews` },
      })
    }
  }

  return NextResponse.json(interview)
}
