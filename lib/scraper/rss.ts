import { XMLParser } from "fast-xml-parser"

export async function fetchFromRSS(feedUrl: string, fieldMappings: Record<string, string>) {
  const response = await fetch(feedUrl)
  if (!response.ok) throw new Error(`RSS fetch error: ${response.status}`)
  const xml = await response.text()
  const parser = new XMLParser({ ignoreAttributes: false })
  const result = parser.parse(xml)
  const items = result?.rss?.channel?.item || result?.feed?.entry || []
  const itemArray = Array.isArray(items) ? items : [items]

  return itemArray.map((item: Record<string, unknown>) => {
    const mapped: Record<string, unknown> = { sourceType: "RSS", sourceUrl: feedUrl }
    for (const [rssField, platformField] of Object.entries(fieldMappings)) {
      if (item[rssField] !== undefined) {
        mapped[platformField] = item[rssField]
      }
    }
    mapped.externalId = mapped.externalId || (item.guid as string) || (item.link as string) || ""
    return mapped
  })
}
