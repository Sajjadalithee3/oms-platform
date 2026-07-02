import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "INTERNAL_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const board = await prisma.jobBoard.findUnique({ where: { id: params.id } })
  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 })
  return NextResponse.json(board)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const board = await prisma.jobBoard.update({ where: { id: params.id }, data: body })
  return NextResponse.json(board)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await prisma.jobBoard.delete({ where: { id: params.id } })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "DELETE", entity: "JobBoard", entityId: params.id, detail: "Job board deleted" },
  })

  return NextResponse.json({ success: true })
}
