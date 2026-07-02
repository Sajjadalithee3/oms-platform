import { XMLParser } from "fast-xml-parser"

interface CVLibraryItem {
  title: string
  link: string
  description: string
  pubDate?: string
  guid?: string | { "#text": string }
  "cv:company"?: string
  "cv:location"?: string
  "cv:salary"?: string
}

function parseSalary(salaryStr: string | undefined): { min: number | null; max: number | null } {
  if (!salaryStr) return { min: null, max: null }
  const numbers = salaryStr.match(/[\d,]+/g)?.map(n => parseInt(n.replace(/,/g, ""), 10)) || []
  if (numbers.length >= 2) return { min: numbers[0], max: numbers[1] }
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] }
  return { min: null, max: null }
}

function normaliseCVLibraryJob(item: CVLibraryItem) {
  const guid = typeof item.guid === "object" ? item.guid["#text"] : (item.guid || item.link || "")
  const salary = parseSalary(item["cv:salary"] as string)

  const titleMatch = item.title?.match(/^(.+?)\s+in\s+(.+)$/)
  const title = titleMatch ? titleMatch[1] : (item.title || "Untitled")
  const locationFromTitle = titleMatch ? titleMatch[2] : null

  const location = (item["cv:location"] as string) || locationFromTitle || "UK"
  const company = (item["cv:company"] as string) || ""

  return {
    title,
    company,
    location,
    description: item.description || "",
    sourceUrl: item.link || "",
    externalId: guid,
    sourceType: "CV_LIBRARY",
    publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    salaryMin: salary.min,
    salaryMax: salary.max,
    country: "United Kingdom",
  }
}

export async function fetchFromCVLibrary(feedUrl: string) {
  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EdvanceFE/1.0)" },
  })
  if (!response.ok) throw new Error(`CV-Library RSS error: ${response.status}`)
  const xml = await response.text()
  const parser = new XMLParser({ ignoreAttributes: false })
  const result = parser.parse(xml)
  const items = result?.rss?.channel?.item || []
  const itemArray = Array.isArray(items) ? items : [items]
  return itemArray.map(normaliseCVLibraryJob)
}
