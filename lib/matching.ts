import { prisma } from "@/lib/prisma"

interface CandidateProfile {
  id: string
  skills: string
  location?: string | null
  desiredSectors?: string | null
  experiences?: Array<{ startDate?: Date | null; endDate?: Date | null; current?: boolean }>
}

interface JobData {
  id: string
  title: string
  sector: string
  location: string
  requiredSkills: string
  experienceLevel?: string | null
}

export interface MatchResult {
  score: number
  matchedSkills: string[]
  missingSkills: string[]
}

function parseSkills(skillsJson: string): string[] {
  try { return JSON.parse(skillsJson) } catch { return [] }
}

function calculateLocationScore(candidateLocation: string | null | undefined, jobLocation: string, maxPoints: number): number {
  if (!candidateLocation || !jobLocation) return 0
  const cl = candidateLocation.toLowerCase().trim()
  const jl = jobLocation.toLowerCase().trim()
  if (cl === jl) return maxPoints
  if (jl.includes(cl) || cl.includes(jl)) return maxPoints * 0.7
  return 0
}

function calculateSeniorityScore(
  experiences: Array<{ startDate?: Date | null; endDate?: Date | null; current?: boolean }> | undefined,
  experienceLevel: string | null | undefined,
  maxPoints: number
): number {
  if (!experiences || !experienceLevel) return 0
  let totalYears = 0
  for (const exp of experiences) {
    if (!exp.startDate) continue
    const end = exp.current ? new Date() : (exp.endDate || new Date())
    totalYears += (end.getTime() - new Date(exp.startDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  }
  const level = experienceLevel.toLowerCase()
  if (level.includes("junior") || level.includes("entry")) return totalYears <= 3 ? maxPoints : maxPoints * 0.5
  if (level.includes("mid")) return totalYears >= 2 && totalYears <= 6 ? maxPoints : maxPoints * 0.5
  if (level.includes("senior")) return totalYears >= 5 ? maxPoints : maxPoints * 0.3
  return maxPoints * 0.5
}

function calculateSectorScore(desiredSectorsJson: string | null | undefined, jobSector: string, maxPoints: number): number {
  if (!desiredSectorsJson) return 0
  const desiredSectors = parseSkills(desiredSectorsJson)
  const jobSectorLower = jobSector.toLowerCase()
  const matches = desiredSectors.some((s) => s.toLowerCase() === jobSectorLower)
  return matches ? maxPoints : 0
}

export function calculateMatchScore(candidate: CandidateProfile, job: JobData): MatchResult {
  const weights = { skills: 45, sector: 30, location: 15, seniority: 10 }

  const candidateSkills = parseSkills(candidate.skills)
  const jobSkills = parseSkills(job.requiredSkills)

  const matchedSkills = candidateSkills.filter((s) =>
    jobSkills.some((js) => js.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(js.toLowerCase()))
  )
  const missingSkills = jobSkills.filter((js) =>
    !candidateSkills.some((s) => s.toLowerCase().includes(js.toLowerCase()) || js.toLowerCase().includes(s.toLowerCase()))
  )

  if (candidateSkills.length === 0) {
    const sectorOnlyScore = calculateSectorScore(candidate.desiredSectors, job.sector, 100)
    return { score: sectorOnlyScore, matchedSkills, missingSkills }
  }

  const skillsScore = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * weights.skills : 0

  const sectorScore = calculateSectorScore(candidate.desiredSectors, job.sector, weights.sector)
  const locationScore = calculateLocationScore(candidate.location, job.location, weights.location)
  const seniorityScore = calculateSeniorityScore(candidate.experiences, job.experienceLevel, weights.seniority)

  const totalScore = Math.round(skillsScore + sectorScore + locationScore + seniorityScore)

  return { score: Math.min(totalScore, 100), matchedSkills, missingSkills }
}

export async function runMatchingForCandidate(candidateId: string, role: "JOB_SEEKER" | "LEARNER") {
  let candidate: CandidateProfile

  if (role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({
      where: { id: candidateId },
      include: { experiences: true },
    })
    if (!profile) return
    candidate = { id: profile.id, skills: profile.skills, location: profile.location, desiredSectors: profile.desiredSectors, experiences: profile.experiences }
  } else {
    const profile = await prisma.jobSeekerProfile.findUnique({
      where: { id: candidateId },
      include: { experiences: true },
    })
    if (!profile) return
    candidate = { id: profile.id, skills: profile.skills, location: profile.location, desiredSectors: profile.desiredSectors, experiences: profile.experiences }
  }

  const jobWhere: Record<string, unknown> = { status: "ACTIVE" }
  const desiredSectorList = parseSkills(candidate.desiredSectors || "[]")
  if (desiredSectorList.length > 0) {
    jobWhere.sector = { in: desiredSectorList }
  }

  const jobs = await prisma.job.findMany({ where: jobWhere })

  for (const job of jobs) {
    const result = calculateMatchScore(candidate, job)
    const matchData = {
      matchScore: result.score,
      matchedSkills: JSON.stringify(result.matchedSkills),
      missingSkills: JSON.stringify(result.missingSkills),
    }
    const where = role === "LEARNER"
      ? { jobId: job.id, learnerId: candidateId }
      : { jobId: job.id, jobSeekerId: candidateId }

    const existing = await prisma.jobMatch.findFirst({ where })
    if (existing) {
      await prisma.jobMatch.update({ where: { id: existing.id }, data: matchData })
    } else {
      await prisma.jobMatch.create({
        data: { jobId: job.id, ...(role === "LEARNER" ? { learnerId: candidateId } : { jobSeekerId: candidateId }), ...matchData },
      })
    }
  }
}

export async function runMatchingForJob(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job || job.status !== "ACTIVE") return

  const jobSeekers = await prisma.jobSeekerProfile.findMany({ include: { experiences: true } })
  for (const js of jobSeekers) {
    const candidate: CandidateProfile = { id: js.id, skills: js.skills, location: js.location, desiredSectors: js.desiredSectors, experiences: js.experiences }
    const result = calculateMatchScore(candidate, job)
    const existing = await prisma.jobMatch.findFirst({ where: { jobId: job.id, jobSeekerId: js.id } })
    const data = { matchScore: result.score, matchedSkills: JSON.stringify(result.matchedSkills), missingSkills: JSON.stringify(result.missingSkills) }
    if (existing) await prisma.jobMatch.update({ where: { id: existing.id }, data })
    else await prisma.jobMatch.create({ data: { jobId: job.id, jobSeekerId: js.id, ...data } })
  }

  const learners = await prisma.learnerProfile.findMany({ include: { experiences: true } })
  for (const l of learners) {
    const candidate: CandidateProfile = { id: l.id, skills: l.skills, location: l.location, desiredSectors: l.desiredSectors, experiences: l.experiences }
    const result = calculateMatchScore(candidate, job)
    const existing = await prisma.jobMatch.findFirst({ where: { jobId: job.id, learnerId: l.id } })
    const data = { matchScore: result.score, matchedSkills: JSON.stringify(result.matchedSkills), missingSkills: JSON.stringify(result.missingSkills) }
    if (existing) await prisma.jobMatch.update({ where: { id: existing.id }, data })
    else await prisma.jobMatch.create({ data: { jobId: job.id, learnerId: l.id, ...data } })
  }
}

export async function runAllMatching() {
  const jobs = await prisma.job.findMany({ where: { status: "ACTIVE" } })
  for (const job of jobs) {
    await runMatchingForJob(job.id)
  }
}
