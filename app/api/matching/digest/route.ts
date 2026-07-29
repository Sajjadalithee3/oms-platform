import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runAllMatching } from "@/lib/matching"
import { sendBatchEmails } from "@/lib/email"
import { dailyDigestEmailTemplate } from "@/lib/email-templates"
import { logEmail } from "@/lib/email-log"

const MIN_SCORE = 50
const TOP_N = 5

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await runAllMatching()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const learners = await prisma.learnerProfile.findMany({ include: { user: { select: { name: true, email: true } } } })
  const jobSeekers = await prisma.jobSeekerProfile.findMany({ include: { user: { select: { name: true, email: true } } } })

  const emails: { to: string; subject: string; html: string; learnerId?: string }[] = []

  for (const learner of learners) {
    const matches = await prisma.jobMatch.findMany({
      where: { learnerId: learner.id, matchScore: { gte: MIN_SCORE }, job: { status: "ACTIVE" } },
      include: { job: true },
      orderBy: { matchScore: "desc" },
      take: TOP_N,
    })
    if (matches.length === 0) continue
    emails.push({
      to: learner.user.email,
      learnerId: learner.id,
      ...dailyDigestEmailTemplate({
        name: learner.user.name || "there",
        matches: matches.map((m) => ({ title: m.job.title, company: m.job.company, score: m.matchScore, link: `${appUrl}/learner/jobs/${m.job.id}` })),
        jobsUrl: `${appUrl}/learner/jobs`,
      }),
    })
  }

  for (const js of jobSeekers) {
    const matches = await prisma.jobMatch.findMany({
      where: { jobSeekerId: js.id, matchScore: { gte: MIN_SCORE }, job: { status: "ACTIVE" } },
      include: { job: true },
      orderBy: { matchScore: "desc" },
      take: TOP_N,
    })
    if (matches.length === 0) continue
    emails.push({
      to: js.user.email,
      ...dailyDigestEmailTemplate({
        name: js.user.name || "there",
        matches: matches.map((m) => ({ title: m.job.title, company: m.job.company, score: m.matchScore, link: `${appUrl}/jobseeker/jobs/${m.job.id}` })),
        jobsUrl: `${appUrl}/jobseeker/jobs`,
      }),
    })
  }

  const result = await sendBatchEmails(emails)

  for (const e of emails) {
    if (e.learnerId) {
      await logEmail({ learnerId: e.learnerId, toEmail: e.to, subject: e.subject, body: e.html, category: "DIGEST" })
    }
  }

  return NextResponse.json({ candidatesChecked: learners.length + jobSeekers.length, digestsSent: result.sent, digestsFailed: result.failed })
}
