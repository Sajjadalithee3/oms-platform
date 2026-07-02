import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseCV } from "@/lib/cv-parser"
import { runMatchingForCandidate } from "@/lib/matching"
import { recalculateProfileCompletion } from "@/lib/profile-completion"
import { getProviderQuotaStatus } from "@/lib/quota"
import { sendBatchEmails } from "@/lib/email"
import { credentialsEmailTemplate } from "@/lib/email-templates"
import bcrypt from "bcryptjs"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

const MAX_SIZE = 5 * 1024 * 1024

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["TRAINING_PROVIDER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const provider = await prisma.providerProfile.findUnique({ where: { userId: session.user.id } })
    if (!provider) {
      return NextResponse.json({ error: "Provider profile not found" }, { status: 404 })
    }

    const formData = await request.formData()
    const files = formData.getAll("cvs") as File[]
    const cohortId = formData.get("cohortId") as string | null
    const courseName = formData.get("courseName") as string | null
    const courseSector = formData.get("courseSector") as string | null

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    if (files.length > 50) {
      return NextResponse.json({ error: "Maximum 50 CVs per batch" }, { status: 400 })
    }

    const quotaStatus = await getProviderQuotaStatus(provider.id)
    let remainingQuota = quotaStatus.remaining
    let skippedDueToQuota = 0

    const results: Array<{
      fileName: string
      status: "created" | "failed"
      name: string
      email: string
      password: string
      skills: string[]
      experienceCount: number
      educationCount: number
      certificateCount: number
      error?: string
    }> = []

    for (const file of files) {
      if (remainingQuota <= 0) {
        skippedDueToQuota++
        results.push({ fileName: file.name, status: "failed", name: "", email: "", password: "", skills: [], experienceCount: 0, educationCount: 0, certificateCount: 0, error: `Monthly learner quota reached (${quotaStatus.cap}/${quotaStatus.cap}). Ask an admin to raise your limit.` })
        continue
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        results.push({ fileName: file.name, status: "failed", name: "", email: "", password: "", skills: [], experienceCount: 0, educationCount: 0, certificateCount: 0, error: "Invalid file type" })
        continue
      }

      if (file.size > MAX_SIZE) {
        results.push({ fileName: file.name, status: "failed", name: "", email: "", password: "", skills: [], experienceCount: 0, educationCount: 0, certificateCount: 0, error: "File too large (max 5MB)" })
        continue
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const parsed = await parseCV(buffer, file.type)

        const email = parsed.email || `learner.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@placeholder.edu`
        const name = parsed.name || file.name.replace(/\.[^.]+$/, "")

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
          results.push({ fileName: file.name, status: "failed", name, email, password: "", skills: parsed.skills, experienceCount: 0, educationCount: 0, certificateCount: 0, error: "Email already registered" })
          continue
        }

        const password = generatePassword()
        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await prisma.user.create({
          data: { email, password: hashedPassword, name, role: "LEARNER", mustChangePassword: true },
        })

        const learnerProfile = await prisma.learnerProfile.create({
          data: {
            userId: user.id,
            providerId: provider.id,
            cohortId: cohortId || null,
            courseName: courseName || null,
            courseSector: courseSector || null,
            headline: name,
            phone: parsed.phone || null,
            location: parsed.location || null,
            skills: JSON.stringify(parsed.skills),
            cvFile: file.name,
            cvText: parsed.rawText.substring(0, 5000),
          },
        })

        let experienceCount = 0
        for (const exp of parsed.experience) {
          if (exp.title && exp.company) {
            await prisma.experience.create({
              data: {
                learnerId: learnerProfile.id,
                title: exp.title,
                company: exp.company,
                startDate: exp.startDate ? new Date(exp.startDate) : null,
                endDate: exp.endDate ? new Date(exp.endDate) : null,
                current: exp.current,
                description: exp.description || null,
              },
            })
            experienceCount++
          }
        }

        let educationCount = 0
        for (const edu of parsed.education) {
          if (edu.institution) {
            await prisma.education.create({
              data: {
                learnerId: learnerProfile.id,
                institution: edu.institution,
                degree: edu.degree || null,
                field: edu.field || null,
                startDate: edu.startDate ? new Date(edu.startDate) : null,
                endDate: edu.endDate ? new Date(edu.endDate) : null,
                current: edu.current,
              },
            })
            educationCount++
          }
        }

        let certificateCount = 0
        for (const cert of parsed.certificates) {
          if (cert.name) {
            await prisma.certificate.create({
              data: {
                learnerId: learnerProfile.id,
                name: cert.name,
                issuer: cert.issuer || null,
                issueDate: cert.issueDate ? new Date(cert.issueDate) : null,
              },
            })
            certificateCount++
          }
        }

        await recalculateProfileCompletion(user.id, "LEARNER")
        await runMatchingForCandidate(learnerProfile.id, "LEARNER")

        remainingQuota--
        results.push({
          fileName: file.name,
          status: "created",
          name,
          email,
          password,
          skills: parsed.skills,
          experienceCount,
          educationCount,
          certificateCount,
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to parse CV"
        console.error(`CV parse error for ${file.name}:`, err)
        results.push({ fileName: file.name, status: "failed", name: "", email: "", password: "", skills: [], experienceCount: 0, educationCount: 0, certificateCount: 0, error: errorMsg })
      }
    }

    const createdCount = results.filter(r => r.status === "created").length

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`
    const { sent: emailsSent, failed: emailsFailed } = await sendBatchEmails(
      results
        .filter(r => r.status === "created")
        .map(r => ({ to: r.email, ...credentialsEmailTemplate({ name: r.name, email: r.email, password: r.password, loginUrl }) }))
    )

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "LearnerProfile",
        entityId: provider.id,
        detail: `Bulk CV upload: ${createdCount} learners created from ${files.length} CVs, profiles populated and matched${skippedDueToQuota > 0 ? `, ${skippedDueToQuota} skipped due to quota limit` : ""}`,
      },
    })

    return NextResponse.json({
      results,
      created: createdCount,
      failed: results.length - createdCount,
      skippedDueToQuota,
      emailsSent,
      emailsFailed,
      quota: { cap: quotaStatus.cap, used: quotaStatus.used + createdCount, remaining: Math.max(0, quotaStatus.remaining - createdCount) },
    }, { status: 201 })
  } catch (error) {
    console.error("Bulk CV upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
