import { prisma } from "@/lib/prisma"

export async function logEmail({
  learnerId,
  toEmail,
  subject,
  body,
  category,
  sentById,
}: {
  learnerId?: string | null
  toEmail: string
  subject: string
  body: string
  category: string
  sentById?: string | null
}) {
  await prisma.emailLog.create({
    data: { learnerId: learnerId || null, toEmail, subject, body, category, sentById: sentById || null },
  })
}
