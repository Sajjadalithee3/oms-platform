import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getProviderAdCap, getProviderAdsUsedThisMonth } from "@/lib/quota"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const ads = await prisma.advertisement.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: "desc" } })
  const used = await getProviderAdsUsedThisMonth(provider.id)
  const cap = getProviderAdCap()

  return NextResponse.json({ ads, used, cap })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const used = await getProviderAdsUsedThisMonth(provider.id)
  const cap = getProviderAdCap()
  if (used >= cap) {
    return NextResponse.json({ error: `Monthly ad limit (${cap}) reached` }, { status: 403 })
  }

  const body = await request.json()
  const { type, imageUrl, text, externalLink, startDate, endDate } = body as {
    type: string
    imageUrl?: string
    text?: string
    externalLink?: string
    startDate: string
    endDate: string
  }

  if (type !== "BANNER_IMAGE" && type !== "ANNOUNCEMENT_BAR") {
    return NextResponse.json({ error: "type must be BANNER_IMAGE or ANNOUNCEMENT_BAR" }, { status: 400 })
  }
  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 })
  }

  const ad = await prisma.advertisement.create({
    data: {
      type,
      imageUrl: imageUrl || null,
      text: text || null,
      externalLink: externalLink || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdByRole: "TRAINING_PROVIDER",
      providerId: provider.id,
    },
  })

  return NextResponse.json(ad)
}
