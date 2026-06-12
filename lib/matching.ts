import { prisma } from "@/lib/prisma"

interface CandidateProfile {
  id: string
  skills: string
  location?: string | null
  desiredRoles?: string | null
  courseSector?: string | null
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

function calculateTitleScore(desiredRolesJson: string | null | undefined, jobTitle: string, maxPoints: number): number {
  if (!desiredRolesJson) return 0
  const desiredRoles = parseSkills(desiredRolesJson)
  const titleLower = jobTitle.toLowerCase()
  for (const role of desiredRoles) {
    if (titleLower.includes(role.toLowerCase()) || role.toLowerCase().includes(titleLower)) return maxPoints
  }
  return 0
}

export function calculateMatchScore(candidate: CandidateProfile, job: JobData): MatchResult {
  const weights = { skills: 50, sector: 20, location: 15, seniority: 10, title: 5 }

  const candidateSkills = parseSkills(candidate.skills)
  const jobSkills = parseSkills(job.requiredSkills)

  const matchedSkills = candidateSkills.filter((s) =>
    jobSkills.some((js) => js.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(js.toLowerCase()))
  )
  const missingSkills = jobSkills.filter((js) =>
    !candidateSkills.some((s) => s.toLowerCase().includes(js.toLowerCase()) || js.toLowerCase().includes(s.toLowerCase()))
  )
  const skillsScore = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * weights.skills : 0

  const sectorField = candidate.courseSector || ""
  const sectorScore = sectorField.toLowerCase() === job.sector.toLowerCase() ? weights.sector : 0

  const locationScore = calculateLocationScore(candidate.location, job.location, weights.location)
  const seniorityScore = calculateSeniorityScore(candidate.experiences, job.experienceLevel, weights.seniority)
  const titleScore = calculateTitleScore(candidate.desiredRoles, job.title, weights.title)

  const totalScore = Math.round(skillsScore + sectorScore + locationScore + seniorityScore + titleScore)

  return { score: Math.min(totalScore, 100), matchedSkills, missingSkills }
}

async function getMinThreshold(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "min_match_threshold" } })
  return setting ? parseInt(setting.value) : 40
}

export async function runMatchingForCandidate(candidateId: string, role: "JOB_SEEKER" | "LEARNER") {
  const minThreshold = await getMinThreshold()
  let candidate: CandidateProfile & { courseSector?: string | null }

  if (role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({
      where: { id: candidateId },
      include: { experiences: true },
    })
    if (!profile) return
    candidate = { id: profile.id, skills: profile.skills, location: profile.location, desiredRoles: profile.desiredRoles, courseSector: profile.courseSector, experiences: profile.experiences }
  } else {
    const profile = await prisma.jobSeekerProfile.findUnique({
      where: { id: candidateId },
      include: { experiences: true },
    })
    if (!profile) return
    candidate = { id: profile.id, skills: profile.skills, location: profile.location, desiredRoles: profile.desiredRoles, courseSector: null, experiences: profile.experiences }
  }

  const jobWhere: Record<string, unknown> = { status: "ACTIVE" }
  if (role === "LEARNER" && candidate.courseSector) {
    jobWhere.sector = candidate.courseSector
  }

  const jobs = await prisma.job.findMany({ where: jobWhere })

  for (const job of jobs) {
    const result = calculateMatchScore(candidate, job)
    if (result.score >= minThreshold) {
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
}

export async function runMatchingForJob(jobId: string) {
  const minThreshold = await getMinThreshold()
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job || job.status !== "ACTIVE") return

  const jobSeekers = await prisma.jobSeekerProfile.findMany({ include: { experiences: true } })
  for (const js of jobSeekers) {
    const candidate: CandidateProfile = { id: js.id, skills: js.skills, location: js.location, desiredRoles: js.desiredRoles, experiences: js.experiences }
    const result = calculateMatchScore(candidate, job)
    if (result.score >= minThreshold) {
      const existing = await prisma.jobMatch.findFirst({ where: { jobId: job.id, jobSeekerId: js.id } })
      const data = { matchScore: result.score, matchedSkills: JSON.stringify(result.matchedSkills), missingSkills: JSON.stringify(result.missingSkills) }
      if (existing) await prisma.jobMatch.update({ where: { id: existing.id }, data })
      else await prisma.jobMatch.create({ data: { jobId: job.id, jobSeekerId: js.id, ...data } })
    }
  }

  const learners = await prisma.learnerProfile.findMany({ where: { courseSector: job.sector }, include: { experiences: true } })
  for (const l of learners) {
    const candidate: CandidateProfile = { id: l.id, skills: l.skills, location: l.location, desiredRoles: l.desiredRoles, courseSector: l.courseSector, experiences: l.experiences }
    const result = calculateMatchScore(candidate, job)
    if (result.score >= minThreshold) {
      const existing = await prisma.jobMatch.findFirst({ where: { jobId: job.id, learnerId: l.id } })
      const data = { matchScore: result.score, matchedSkills: JSON.stringify(result.matchedSkills), missingSkills: JSON.stringify(result.missingSkills) }
      if (existing) await prisma.jobMatch.update({ where: { id: existing.id }, data })
      else await prisma.jobMatch.create({ data: { jobId: job.id, learnerId: l.id, ...data } })
    }
  }
}

export async function runAllMatching() {
  const jobs = await prisma.job.findMany({ where: { status: "ACTIVE" } })
  for (const job of jobs) {
    await runMatchingForJob(job.id)
  }
}
