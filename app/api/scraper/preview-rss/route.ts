import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { XMLParser } = require("fast-xml-parser")

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const feedUrl = searchParams.get("url")
  if (!feedUrl) return NextResponse.json({ error: "URL required" }, { status: 400 })

  try {
    const response = await fetch(feedUrl)
    const xml = await response.text()
    const parser = new XMLParser({ ignoreAttributes: false })
    const result = parser.parse(xml)
    const items = result?.rss?.channel?.item || result?.feed?.entry || []
    const itemArray = Array.isArray(items) ? items : [items]
    const sample = itemArray[0] || {}
    const fields = Object.keys(sample).filter(k => typeof sample[k] === "string" || typeof sample[k] === "number")

    return NextResponse.json({ fields, sample })
  } catch {
    return NextResponse.json({ fields: [], sample: null, error: "Failed to parse feed" })
  }
}
