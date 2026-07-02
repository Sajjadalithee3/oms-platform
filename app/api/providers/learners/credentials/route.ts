import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendBatchEmails } from "@/lib/email"
import { credentialsEmailTemplate } from "@/lib/email-templates"
import bcrypt from "bcryptjs"

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
    include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
  })

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`
  const passwordsByUserId = new Map<string, string>()

  const neverLoggedIn = learners.filter((l) => !l.user.lastLoginAt)
  for (const learner of neverLoggedIn) {
    const password = generatePassword()
    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { id: learner.user.id }, data: { password: hashedPassword, mustChangePassword: true } })
    passwordsByUserId.set(learner.user.id, password)
  }

  if (neverLoggedIn.length > 0) {
    await sendBatchEmails(
      neverLoggedIn.map((l) => ({
        to: l.user.email,
        ...credentialsEmailTemplate({
          name: l.user.name || "there",
          email: l.user.email,
          password: passwordsByUserId.get(l.user.id)!,
          loginUrl,
        }),
      }))
    )
  }

  const csv = [
    "name,email,password,login_url",
    ...learners.map((l) =>
      `"${l.user.name || ""}","${l.user.email}","${passwordsByUserId.get(l.user.id) || ""}","${loginUrl}"`
    ),
  ].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=learner-credentials.csv",
    },
  })
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
