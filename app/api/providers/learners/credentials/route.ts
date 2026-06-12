import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "TRAINING_PROVIDER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 })

  const learners = await prisma.learnerProfile.findMany({
    where: { providerId: provider.id },
    include: { user: { select: { name: true, email: true } } },
  })

  const csv = [
    "name,email,login_url",
    ...learners.map((l) =>
      `"${l.user.name || ""}","${l.user.email}","${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login"`
    ),
  ].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=learner-credentials.csv",
    },
  })
}
