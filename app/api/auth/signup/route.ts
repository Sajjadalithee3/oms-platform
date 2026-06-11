import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, role, ...profileData } = body

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const allowedRoles: Role[] = [Role.JOB_SEEKER, Role.EMPLOYER, Role.TRAINING_PROVIDER]
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role for public signup" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    })

    if (role === Role.EMPLOYER) {
      await prisma.employerProfile.create({
        data: {
          userId: user.id,
          companyName: profileData.companyName || "",
          industry: profileData.industry || null,
          location: profileData.location || null,
        },
      })
    } else if (role === Role.JOB_SEEKER) {
      await prisma.jobSeekerProfile.create({
        data: {
          userId: user.id,
        },
      })
    } else if (role === Role.TRAINING_PROVIDER) {
      await prisma.providerProfile.create({
        data: {
          userId: user.id,
          organisationName: profileData.organisationName || "",
          contactName: profileData.contactName || name,
          contactPhone: profileData.contactPhone || null,
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entity: "User",
        entityId: user.id,
        detail: `New ${role} account created via signup`,
      },
    })

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
