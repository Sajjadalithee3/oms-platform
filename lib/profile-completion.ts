interface JobSeekerFields {
  headline?: string | null
  bio?: string | null
  phone?: string | null
  location?: string | null
  skills?: string | null
  experiences?: unknown[]
  educations?: unknown[]
  desiredRoles?: string | null
  desiredSalaryMin?: number | null
  desiredLocation?: string | null
  cvFile?: string | null
}

interface LearnerFields {
  headline?: string | null
  bio?: string | null
  phone?: string | null
  location?: string | null
  skills?: string | null
  experiences?: unknown[]
  educations?: unknown[]
  desiredRoles?: string | null
  desiredSalaryMin?: number | null
  desiredLocation?: string | null
  cvFile?: string | null
}

export function calculateJobSeekerCompletion(profile: JobSeekerFields): {
  percentage: number
  incomplete: string[]
} {
  const sections: { name: string; weight: number; filled: boolean }[] = [
    {
      name: "Personal Info",
      weight: 20,
      filled: !!(profile.headline && profile.phone && profile.location),
    },
    {
      name: "Skills",
      weight: 20,
      filled: hasItems(profile.skills),
    },
    {
      name: "Experience",
      weight: 20,
      filled: (profile.experiences?.length ?? 0) > 0,
    },
    {
      name: "Education",
      weight: 15,
      filled: (profile.educations?.length ?? 0) > 0,
    },
    {
      name: "Preferences",
      weight: 15,
      filled: !!(hasItems(profile.desiredRoles) && profile.desiredLocation),
    },
    {
      name: "CV Upload",
      weight: 10,
      filled: !!profile.cvFile,
    },
  ]

  const percentage = sections.reduce(
    (sum, s) => sum + (s.filled ? s.weight : 0),
    0
  )
  const incomplete = sections.filter((s) => !s.filled).map((s) => s.name)

  return { percentage, incomplete }
}

export function calculateLearnerCompletion(profile: LearnerFields): {
  percentage: number
  incomplete: string[]
} {
  const sections: { name: string; weight: number; filled: boolean }[] = [
    {
      name: "Personal Info",
      weight: 20,
      filled: !!(profile.headline && profile.phone && profile.location),
    },
    {
      name: "Skills",
      weight: 20,
      filled: hasItems(profile.skills),
    },
    {
      name: "Experience",
      weight: 20,
      filled: (profile.experiences?.length ?? 0) > 0,
    },
    {
      name: "Education",
      weight: 15,
      filled: (profile.educations?.length ?? 0) > 0,
    },
    {
      name: "Preferences",
      weight: 15,
      filled: !!(hasItems(profile.desiredRoles) && profile.desiredLocation),
    },
    {
      name: "CV Upload",
      weight: 10,
      filled: !!profile.cvFile,
    },
  ]

  const percentage = sections.reduce(
    (sum, s) => sum + (s.filled ? s.weight : 0),
    0
  )
  const incomplete = sections.filter((s) => !s.filled).map((s) => s.name)

  return { percentage, incomplete }
}

function hasItems(jsonStr?: string | null): boolean {
  if (!jsonStr) return false
  try {
    const arr = JSON.parse(jsonStr)
    return Array.isArray(arr) && arr.length > 0
  } catch {
    return false
  }
}

export { recalculateProfileCompletion }

async function recalculateProfileCompletion(userId: string, role: string) {
  const { prisma } = await import("@/lib/prisma")

  if (role === "JOB_SEEKER") {
    const profile = await prisma.jobSeekerProfile.findUnique({
      where: { userId },
      include: { experiences: true, educations: true, certificates: true },
    })
    if (!profile) return null
    const completion = calculateJobSeekerCompletion(profile)
    await prisma.jobSeekerProfile.update({
      where: { userId },
      data: { profileComplete: completion.percentage },
    })
    return completion
  }

  if (role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({
      where: { userId },
      include: { experiences: true, educations: true, certificates: true },
    })
    if (!profile) return null
    const completion = calculateLearnerCompletion(profile)
    await prisma.learnerProfile.update({
      where: { userId },
      data: { profileComplete: completion.percentage },
    })
    return completion
  }

  return null
}
