import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const settings = await prisma.systemSetting.findMany()
  return NextResponse.json(settings)
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { key, value } = body

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "UPDATE", entity: "SystemSetting", entityId: setting.id, detail: `Setting "${key}" = "${value}"` },
  })

  return NextResponse.json(setting)
}
