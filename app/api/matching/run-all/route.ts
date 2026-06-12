import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runAllMatching } from "@/lib/matching"

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "INTERNAL_STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await runAllMatching()
  return NextResponse.json({ success: true })
}
