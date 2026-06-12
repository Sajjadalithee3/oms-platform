"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Play, Plus, Trash2, RefreshCw, Settings2 } from "lucide-react"

interface JobBoard {
  id: string
  name: string
  type: string
  baseUrl: string
  isActive: boolean
  lastRun: string | null
  lastRunStatus: string | null
  jobsScraped: number
}

export default function AdminScraperPage() {
  const [boards, setBoards] = useState<JobBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", type: "RSS", baseUrl: "", apiKey: "" })

  const fetchBoards = () => {
    fetch("/api/scraper/boards").then(r => r.json()).then(d => { setBoards(d); setLoading(false) })
  }

  useEffect(() => { fetchBoards() }, [])

  const addBoard = async () => {
    await fetch("/api/scraper/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setForm({ name: "", type: "RSS", baseUrl: "", apiKey: "" })
    setShowAdd(false)
    fetchBoards()
  }

  const deleteBoard = async (id: string) => {
    await fetch(`/api/scraper/boards/${id}`, { method: "DELETE" })
    fetchBoards()
  }

  const runScraper = async (id: string) => {
    setRunning(id)
    try {
      await fetch(`/api/scraper/run/${id}`, { method: "POST" })
      fetchBoards()
    } finally {
      setRunning(null)
    }
  }

  if (loading) return <><TopBar title="Job Scraper" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Job Scraper" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{boards.length} job boards configured</p>
          <Button onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-2" />Add Board</Button>
        </div>

        {showAdd && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input placeholder="Board name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="RSS">RSS Feed</option>
                <option value="REED">Reed API</option>
                <option value="ADZUNA">Adzuna API</option>
                <option value="GENERIC">Generic URL</option>
              </Select>
              <Input placeholder="Base URL / Feed URL" value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })} />
              {(form.type === "REED" || form.type === "ADZUNA") && (
                <Input placeholder="API Key" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} />
              )}
              <div className="flex gap-2">
                <Button onClick={addBoard}>Save</Button>
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {boards.map(board => (
            <Card key={board.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{board.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={board.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                      {board.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary">{board.type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">{board.baseUrl}</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {board.lastRun ? `Last run: ${new Date(board.lastRun).toLocaleString()} (${board.lastRunStatus})` : "Never run"}
                    {board.jobsScraped > 0 && ` | ${board.jobsScraped} jobs scraped`}
                  </div>
                  <div className="flex gap-2">
                    {board.type === "RSS" && (
                      <Button size="sm" variant="outline" onClick={() => window.location.href = `/admin/scraper/${board.id}/mapping`}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => runScraper(board.id)} disabled={running === board.id}>
                      {running === board.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteBoard(board.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {boards.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No job boards configured. Add one to start scraping.</p>}
        </div>
      </div>
    </>
  )
}
