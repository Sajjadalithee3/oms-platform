import { XMLParser } from "fast-xml-parser"

interface MonsterItem {
  title: string
  link: string
  description: string
  pubDate?: string
  guid?: string | { "#text": string }
  company?: string
  "job:location"?: string
  "job:company"?: string
}

function normaliseMonsterJob(item: MonsterItem) {
  const location = (item["job:location"] as string) || "UK"
  const company = (item["job:company"] as string) || item.company || ""
  const guid = typeof item.guid === "object" ? item.guid["#text"] : (item.guid || item.link || "")

  return {
    title: item.title || "Untitled",
    company,
    location,
    description: item.description || "",
    sourceUrl: item.link || "",
    externalId: guid,
    sourceType: "MONSTER",
    publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    country: "United Kingdom",
  }
}

export async function fetchFromMonster(feedUrl: string) {
  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EdvanceFE/1.0)" },
  })
  if (!response.ok) throw new Error(`Monster RSS error: ${response.status}`)
  const xml = await response.text()
  const parser = new XMLParser({ ignoreAttributes: false })
  const result = parser.parse(xml)
  const items = result?.rss?.channel?.item || result?.feed?.entry || []
  const itemArray = Array.isArray(items) ? items : [items]
  return itemArray.map(normaliseMonsterJob)
}
