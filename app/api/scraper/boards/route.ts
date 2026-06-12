import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "INTERNAL_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const boards = await prisma.jobBoard.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(boards)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { name, boardType, apiKey, feedUrl, genericUrl, schedule, fieldMappings } = body

  const board = await prisma.jobBoard.create({
    data: {
      name, boardType,
      apiKey: apiKey || null,
      feedUrl: feedUrl || null,
      genericUrl: genericUrl || null,
      schedule: schedule || "DAILY",
      fieldMappings: fieldMappings ? JSON.stringify(fieldMappings) : "{}",
    },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "JobBoard", entityId: board.id, detail: `Board "${name}" (${boardType}) added` },
  })

  return NextResponse.json(board, { status: 201 })
}
