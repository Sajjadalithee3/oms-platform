import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const UK_BOARDS = [
  {
    name: "Indeed UK",
    boardType: "INDEED",
    feedUrl: "https://www.indeed.co.uk/rss?l=United+Kingdom&sort=date&fromage=1",
    schedule: "DAILY",
    scheduleTime: "06:00",
    maxJobs: 200,
    filterDummy: true,
    fieldMappings: "{}",
  },
  {
    name: "Reed UK",
    boardType: "REED",
    feedUrl: null,
    schedule: "DAILY",
    scheduleTime: "06:30",
    maxJobs: 200,
    filterDummy: true,
    filterCategory: "healthcare OR technology OR construction OR education OR nursing",
    filterLocation: "uk",
    fieldMappings: "{}",
  },
  {
    name: "CV-Library UK",
    boardType: "CV_LIBRARY",
    feedUrl: "https://www.cv-library.co.uk/rss/jobs?q=&geo=United+Kingdom&posted=1",
    schedule: "DAILY",
    scheduleTime: "07:00",
    maxJobs: 200,
    filterDummy: true,
    fieldMappings: "{}",
  },
  {
    name: "Monster UK",
    boardType: "MONSTER",
    feedUrl: "https://www.monster.co.uk/jobs/search/rss?q=&where=United+Kingdom&tm=1",
    schedule: "DAILY",
    scheduleTime: "07:30",
    maxJobs: 200,
    filterDummy: true,
    fieldMappings: "{}",
  },
  {
    name: "GOV.UK Find a Job",
    boardType: "GOVUK",
    feedUrl: "https://www.jobs.service.gov.uk/rss",
    schedule: "DAILY",
    scheduleTime: "08:00",
    maxJobs: 200,
    filterDummy: true,
    fieldMappings: "{}",
  },
]

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const results: Array<{ name: string; status: string; id?: string }> = []

  for (const board of UK_BOARDS) {
    const existing = await prisma.jobBoard.findFirst({
      where: { name: board.name },
    })

    if (existing) {
      results.push({ name: board.name, status: "already exists", id: existing.id })
      continue
    }

    const created = await prisma.jobBoard.create({
      data: {
        name: board.name,
        boardType: board.boardType,
        feedUrl: board.feedUrl,
        schedule: board.schedule,
        scheduleTime: board.scheduleTime,
        maxJobs: board.maxJobs,
        filterDummy: board.filterDummy,
        filterCategory: board.filterCategory || null,
        filterLocation: board.filterLocation || null,
        fieldMappings: board.fieldMappings,
        isActive: true,
      },
    })

    results.push({ name: board.name, status: "created", id: created.id })
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "JobBoard",
      entityId: "seed-uk",
      detail: `Seeded ${results.filter(r => r.status === "created").length} UK job boards`,
    },
  })

  return NextResponse.json({ success: true, boards: results })
}
