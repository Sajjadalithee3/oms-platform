import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runScraper } from "@/lib/scraper/runner"

export async function POST(_request: Request, { params }: { params: { boardId: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const result = await runScraper(params.boardId)
  return NextResponse.json(result)
}
