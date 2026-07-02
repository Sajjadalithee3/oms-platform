import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

const COOKIE_NAME = "impersonate_user_id"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INTERNAL_STAFF") {
    return NextResponse.json({ error: "Only admins can impersonate" }, { status: 403 })
  }

  const body = await request.json()
  const { userId } = body

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  })

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, userId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 4,
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "IMPERSONATE",
      entity: "User",
      entityId: userId,
      detail: `Admin ${session.user.name} started impersonating ${target.name} (${target.role})`,
    },
  })

  const roleRedirects: Record<string, string> = {
    SUPER_ADMIN: "/admin",
    INTERNAL_STAFF: "/staff",
    TRAINING_PROVIDER: "/provider",
    EMPLOYER: "/employer",
    LEARNER: "/learner",
    JOB_SEEKER: "/jobseeker",
  }

  return NextResponse.json({
    redirect: roleRedirects[target.role] || "/",
    user: { id: target.id, name: target.name, role: target.role },
  })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)

  const adminRedirect = session.user.role === "INTERNAL_STAFF" ? "/staff" : "/admin"

  return NextResponse.json({ redirect: adminRedirect })
}
