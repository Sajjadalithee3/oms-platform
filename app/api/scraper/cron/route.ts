import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runScraper } from "@/lib/scraper/runner"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const currentHour = now.getUTCHours().toString().padStart(2, "0")
  const currentMinute = now.getUTCMinutes().toString().padStart(2, "0")
  const currentTime = `${currentHour}:${currentMinute}`

  const boards = await prisma.jobBoard.findMany({
    where: { isActive: true },
  })

  const dueBoards = boards.filter(board => {
    const scheduleTime = board.scheduleTime || "06:00"
    const [schedHour] = scheduleTime.split(":")
    const [curHour] = currentTime.split(":")
    if (schedHour !== curHour) return false

    if (board.schedule === "HOURLY") return true

    if (board.schedule === "DAILY" || !board.schedule) {
      const schedMin = scheduleTime.split(":")[1] || "00"
      const curMin = currentTime.split(":")[1]
      return Math.abs(parseInt(curMin) - parseInt(schedMin)) <= 5
    }

    if (board.schedule === "WEEKLY") {
      if (now.getUTCDay() !== 1) return false
      const schedMin = scheduleTime.split(":")[1] || "00"
      const curMin = currentTime.split(":")[1]
      return Math.abs(parseInt(curMin) - parseInt(schedMin)) <= 5
    }

    return false
  })

  const results = []
  for (const board of dueBoards) {
    const result = await runScraper(board.id)
    results.push({ boardId: board.id, name: board.name, ...result })
  }

  return NextResponse.json({
    time: currentTime,
    boardsChecked: boards.length,
    boardsRun: dueBoards.length,
    results,
  })
}
