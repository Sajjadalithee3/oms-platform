import { prisma } from "@/lib/prisma"
import { fetchFromReed } from "./reed"
import { fetchFromAdzuna } from "./adzuna"
import { fetchFromRSS } from "./rss"
import { fetchFromIndeed } from "./indeed"
import { fetchFromMonster } from "./monster"
import { fetchFromCVLibrary } from "./cvlibrary"
import { fetchFromGovUK } from "./govuk"
import { runMatchingForJob } from "@/lib/matching"
import { isDummyJob, matchesLocationFilter, matchesCategoryFilter } from "./filter"

export function fixMojibake(text: string): string {
  return text
    .replace(/â€™/g, "'").replace(/â€œ/g, "“").replace(/â€/g, "”")
    .replace(/â€"/g, "–").replace(/â€"/g, "—").replace(/â€¦/g, "…")
    .replace(/â€˜/g, "‘").replace(/â€‹/g, "")
    .replace(/Ã©/g, "é").replace(/Ã³/g, "ó").replace(/Ã¡/g, "á").replace(/Ã±/g, "ñ").replace(/Ã¼/g, "ü")
    .replace(/â[\x80-\xBF][\x80-\xBF]/g, "'")
}

export function inferSector(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()
  if (text.match(/nurse|care|health|medical|clinical|nhs/)) return "Health & Social Care"
  if (text.match(/developer|engineer|software|tech|it |data|cyber/)) return "Technology"
  if (text.match(/teach|education|tutor|school|college/)) return "Education"
  if (text.match(/finance|accountan|audit|tax|banking/)) return "Finance"
  if (text.match(/market|sales|digital|seo|content/)) return "Marketing & Sales"
  if (text.match(/construc|site|build|plumb|electric/)) return "Construction"
  if (text.match(/logistics|warehouse|driver|supply chain/)) return "Logistics"
  return "General"
}

export async function runScraper(boardId: string) {
  const board = await prisma.jobBoard.findUnique({ where: { id: boardId } })
  if (!board || !board.isActive) return { success: false, error: "Board not found or inactive" }

  let jobs: Array<Record<string, unknown>> = []

  try {
    if (board.boardType === "REED") {
      const keywords = board.filterCategory || "healthcare OR technology OR business"
      const location = board.filterLocation || "uk"
      jobs = await fetchFromReed(board.apiKey!, keywords, location)
    } else if (board.boardType === "ADZUNA") {
      const [appId, appKey] = (board.apiKey || ":").split(":")
      jobs = await fetchFromAdzuna(appId, appKey, board.filterCategory || "", board.filterLocation || "uk")
    } else if (board.boardType === "INDEED") {
      jobs = await fetchFromIndeed(board.feedUrl!)
    } else if (board.boardType === "MONSTER") {
      jobs = await fetchFromMonster(board.feedUrl!)
    } else if (board.boardType === "CV_LIBRARY") {
      jobs = await fetchFromCVLibrary(board.feedUrl!)
    } else if (board.boardType === "GOVUK") {
      jobs = await fetchFromGovUK(board.feedUrl!)
    } else if (board.boardType === "RSS") {
      const mappings = JSON.parse(board.fieldMappings)
      jobs = await fetchFromRSS(board.feedUrl!, mappings)
    } else if (board.boardType === "GENERIC") {
      return { success: false, error: "Generic boards require manual field mapping" }
    }

    let filtered = jobs
    if (board.filterDummy) {
      filtered = filtered.filter(job => !isDummyJob(job))
    }
    if (board.filterLocation) {
      filtered = filtered.filter(job => matchesLocationFilter(job, board.filterLocation!))
    }
    if (board.filterCategory) {
      filtered = filtered.filter(job => matchesCategoryFilter(job, board.filterCategory!))
    }
    if (board.maxJobs > 0) {
      filtered = filtered.slice(0, board.maxJobs)
    }

    let created = 0
    for (const job of filtered) {
      const externalId = String(job.externalId || `${job.title}-${job.company}`)
      const existing = await prisma.job.findFirst({ where: { externalId } })
      const sector = inferSector(String(job.title || ""), String(job.description || ""))

      // Normalize requiredSkills to JSON array
      if (job.requiredSkills && typeof job.requiredSkills === "string") {
        try {
          JSON.parse(job.requiredSkills as string)
        } catch {
          job.requiredSkills = JSON.stringify(
            (job.requiredSkills as string).split(",").map(s => s.trim()).filter(Boolean)
          )
        }
      }

      // Extract skills from description if none provided
      if (!job.requiredSkills || job.requiredSkills === "[]") {
        const desc = String(job.description || "").toLowerCase()
        const commonSkills = ["javascript","typescript","react","node","python","java","sql","aws","docker","kubernetes","git","html","css","angular","vue","php","ruby","c#",".net","azure","gcp","linux","agile","scrum","jira","excel","power bi","tableau","salesforce","sap","communication","leadership","project management","data analysis","machine learning","ai","devops","ci/cd","rest api","graphql","mongodb","postgresql","redis","terraform","figma","photoshop","marketing","seo","analytics"]
        const found = commonSkills.filter(s => desc.includes(s))
        if (found.length > 0) job.requiredSkills = JSON.stringify(found)
      }

      if (existing) {
        await prisma.job.update({
          where: { id: existing.id },
          data: {
            title: fixMojibake(String(job.title || existing.title)),
            company: fixMojibake(String(job.company || existing.company)),
            location: String(job.location || existing.location),
            description: fixMojibake(String(job.description || existing.description)),
            salaryMin: (job.salaryMin as number) || existing.salaryMin,
            salaryMax: (job.salaryMax as number) || existing.salaryMax,
            sourceUrl: String(job.sourceUrl || existing.sourceUrl),
            region: job.region ? String(job.region) : existing.region,
            country: job.country ? String(job.country) : existing.country,
            state: job.state ? String(job.state) : existing.state,
            city: job.city ? String(job.city) : existing.city,
            category: job.category ? String(job.category) : existing.category,
            jobType: job.jobType ? String(job.jobType) : existing.jobType,
            contractType: job.contractType ? String(job.contractType) : existing.contractType,
            workingHours: job.workingHours ? String(job.workingHours) : existing.workingHours,
            salaryCurrency: job.salaryCurrency ? String(job.salaryCurrency) : existing.salaryCurrency,
            salaryPeriod: job.salaryPeriod ? String(job.salaryPeriod) : existing.salaryPeriod,
            experienceLevel: job.experienceLevel ? String(job.experienceLevel) : existing.experienceLevel,
            qualifications: job.qualifications ? String(job.qualifications) : existing.qualifications,
            requiredSkills: job.requiredSkills ? String(job.requiredSkills) : existing.requiredSkills,
          },
        })
      } else {
        const isRemote = job.isRemote === true || job.isRemote === "true" ||
          String(job.location || "").toLowerCase().includes("remote") ||
          String(job.jobType || "").toLowerCase().includes("remote")

        const newJob = await prisma.job.create({
          data: {
            title: fixMojibake(String(job.title || "Untitled")),
            company: fixMojibake(String(job.company || "Unknown")),
            location: String(job.location || "UK"),
            region: job.region ? String(job.region) : null,
            country: job.country ? String(job.country) : null,
            state: job.state ? String(job.state) : null,
            city: job.city ? String(job.city) : null,
            sector,
            category: job.category ? String(job.category) : null,
            jobType: job.jobType ? String(job.jobType) : null,
            contractType: job.contractType ? String(job.contractType) : null,
            workingHours: job.workingHours ? String(job.workingHours) : null,
            salaryMin: (job.salaryMin as number) || null,
            salaryMax: (job.salaryMax as number) || null,
            salaryCurrency: job.salaryCurrency ? String(job.salaryCurrency) : null,
            salaryPeriod: job.salaryPeriod ? String(job.salaryPeriod) : null,
            description: fixMojibake(String(job.description || "")),
            requiredSkills: job.requiredSkills ? String(job.requiredSkills) : "[]",
            experienceLevel: job.experienceLevel ? String(job.experienceLevel) : null,
            qualifications: job.qualifications ? String(job.qualifications) : null,
            publishedAt: job.publishedAt ? new Date(String(job.publishedAt)) : null,
            expiresAt: job.expiresAt ? new Date(String(job.expiresAt)) : null,
            sourceType: String(job.sourceType || board.boardType),
            sourceUrl: String(job.sourceUrl || ""),
            externalId,
            sourceBoardId: board.id,
            isRemote: Boolean(isRemote),
          },
        })
        created++
        await runMatchingForJob(newJob.id)
      }
    }

    await prisma.jobBoard.update({
      where: { id: boardId },
      data: { lastFetchedAt: new Date(), lastJobCount: filtered.length, lastError: null },
    })

    return { success: true, total: jobs.length, filtered: filtered.length, created, rejected: jobs.length - filtered.length }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    await prisma.jobBoard.update({
      where: { id: boardId },
      data: { lastError: errorMessage },
    })
    return { success: false, error: errorMessage }
  }
}
