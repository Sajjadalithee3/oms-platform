import { XMLParser } from "fast-xml-parser"

interface IndeedItem {
  title: string
  link: string
  description: string
  pubDate: string
  source?: string
  guid?: string
  "georss:point"?: string
}

function normaliseIndeedJob(item: IndeedItem) {
  const locationMatch = item.title?.match(/-\s*([^-]+)$/)
  const titleClean = item.title?.replace(/-\s*[^-]+$/, "").trim() || "Untitled"
  const location = locationMatch ? locationMatch[1].trim() : "UK"

  const companyMatch = item.description?.match(/^(.*?)\s*-\s*/)
  const company = item.source || (companyMatch ? companyMatch[1].trim() : "")

  return {
    title: titleClean,
    company,
    location,
    description: item.description || "",
    sourceUrl: item.link || "",
    externalId: item.guid || item.link || "",
    sourceType: "INDEED",
    publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    country: "United Kingdom",
  }
}

export async function fetchFromIndeed(feedUrl: string) {
  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EdvanceFE/1.0)" },
  })
  if (!response.ok) throw new Error(`Indeed RSS error: ${response.status}`)
  const xml = await response.text()
  const parser = new XMLParser({ ignoreAttributes: false })
  const result = parser.parse(xml)
  const items = result?.rss?.channel?.item || []
  const itemArray = Array.isArray(items) ? items : [items]
  return itemArray.map(normaliseIndeedJob)
}
