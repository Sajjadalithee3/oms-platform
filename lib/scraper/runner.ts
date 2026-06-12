import { prisma } from "@/lib/prisma"
import { fetchFromReed } from "./reed"
import { fetchFromAdzuna } from "./adzuna"
import { fetchFromRSS } from "./rss"
import { runMatchingForJob } from "@/lib/matching"

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
      jobs = await fetchFromReed(board.apiKey!, "healthcare OR technology OR business", "uk")
    } else if (board.boardType === "ADZUNA") {
      const [appId, appKey] = (board.apiKey || ":").split(":")
      jobs = await fetchFromAdzuna(appId, appKey)
    } else if (board.boardType === "RSS") {
      const mappings = JSON.parse(board.fieldMappings)
      jobs = await fetchFromRSS(board.feedUrl!, mappings)
    } else if (board.boardType === "GENERIC") {
      return { success: false, error: "Generic boards require manual field mapping" }
    }

    let created = 0
    for (const job of jobs) {
      const externalId = (job.externalId as string) || `${job.title}-${job.company}`
      const existing = await prisma.job.findFirst({ where: { externalId } })
      const sector = inferSector(String(job.title || ""), String(job.description || ""))

      if (existing) {
        await prisma.job.update({
          where: { id: existing.id },
          data: {
            title: String(job.title || existing.title),
            company: String(job.company || existing.company),
            location: String(job.location || existing.location),
            description: String(job.description || existing.description),
            salaryMin: (job.salaryMin as number) || existing.salaryMin,
            salaryMax: (job.salaryMax as number) || existing.salaryMax,
            sourceUrl: String(job.sourceUrl || existing.sourceUrl),
          },
        })
      } else {
        const newJob = await prisma.job.create({
          data: {
            title: String(job.title || "Untitled"),
            company: String(job.company || "Unknown"),
            location: String(job.location || "UK"),
            sector,
            description: String(job.description || ""),
            salaryMin: (job.salaryMin as number) || null,
            salaryMax: (job.salaryMax as number) || null,
            sourceType: String(job.sourceType || board.boardType),
            sourceUrl: String(job.sourceUrl || ""),
            externalId,
            sourceBoardId: board.id,
          },
        })
        created++
        await runMatchingForJob(newJob.id)
      }
    }

    await prisma.jobBoard.update({
      where: { id: boardId },
      data: { lastFetchedAt: new Date(), lastJobCount: jobs.length, lastError: null },
    })

    return { success: true, total: jobs.length, created }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    await prisma.jobBoard.update({
      where: { id: boardId },
      data: { lastError: errorMessage },
    })
    return { success: false, error: errorMessage }
  }
}
