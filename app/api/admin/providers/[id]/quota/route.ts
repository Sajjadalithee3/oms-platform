import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProviderQuotaStatus } from "@/lib/quota"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await request.json()
  const { quota } = body as { quota: number | null }

  if (quota != null && (typeof quota !== "number" || quota < 0)) {
    return NextResponse.json({ error: "Quota must be a non-negative number or null" }, { status: 400 })
  }

  const provider = await prisma.providerProfile.update({
    where: { id },
    data: { learnerQuotaOverride: quota },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATE",
      entity: "ProviderProfile",
      entityId: provider.id,
      detail: quota != null ? `Learner quota override set to ${quota}` : "Learner quota override cleared (automatic doubling re-enabled)",
    },
  })

  const status = await getProviderQuotaStatus(provider.id)
  return NextResponse.json({ ...provider, ...status })
}
