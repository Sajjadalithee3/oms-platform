import { XMLParser } from "fast-xml-parser"

interface GovUKItem {
  title: string
  link: string
  description: string
  pubDate?: string
  guid?: string | { "#text": string }
}

function normaliseGovUKJob(item: GovUKItem) {
  const guid = typeof item.guid === "object" ? item.guid["#text"] : (item.guid || item.link || "")

  const locationMatch = item.title?.match(/\(([^)]+)\)\s*$/)
  const location = locationMatch ? locationMatch[1] : "UK"
  const title = item.title?.replace(/\s*\([^)]+\)\s*$/, "").trim() || "Untitled"

  const companyMatch = item.description?.match(/Employer:\s*([^\n<]+)/i)
  const company = companyMatch ? companyMatch[1].trim() : ""

  const salaryMatch = item.description?.match(/Salary:\s*£?([\d,]+)/i)
  const salary = salaryMatch ? parseInt(salaryMatch[1].replace(/,/g, ""), 10) : null

  return {
    title,
    company,
    location,
    description: item.description || "",
    sourceUrl: item.link || "",
    externalId: guid,
    sourceType: "GOVUK",
    publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    salaryMin: salary,
    salaryMax: salary,
    country: "United Kingdom",
  }
}

export async function fetchFromGovUK(feedUrl: string) {
  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EdvanceFE/1.0)" },
  })
  if (!response.ok) throw new Error(`GOV.UK Jobs error: ${response.status}`)
  const xml = await response.text()
  const parser = new XMLParser({ ignoreAttributes: false })
  const result = parser.parse(xml)
  const items = result?.rss?.channel?.item || result?.feed?.entry || []
  const itemArray = Array.isArray(items) ? items : [items]
  return itemArray.map(normaliseGovUKJob)
}
