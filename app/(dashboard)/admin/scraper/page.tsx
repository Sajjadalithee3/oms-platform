"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Play, Plus, Trash2, RefreshCw, Settings2, Filter, Clock, MapPin, Tag, Shield, Globe } from "lucide-react"

interface JobBoard {
  id: string
  name: string
  boardType: string
  feedUrl: string | null
  genericUrl: string | null
  isActive: boolean
  schedule: string
  scheduleTime: string
  lastFetchedAt: string | null
  lastError: string | null
  lastJobCount: number
  filterLocation: string | null
  filterCategory: string | null
  maxJobs: number
  filterDummy: boolean
}

interface RunResult {
  success: boolean
  total?: number
  filtered?: number
  created?: number
  rejected?: number
  error?: string
}

export default function AdminScraperPage() {
  const [boards, setBoards] = useState<JobBoard[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<Record<string, RunResult>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [editingFilters, setEditingFilters] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", type: "RSS", baseUrl: "", apiKey: "" })
  const [filterForm, setFilterForm] = useState({ filterLocation: "", filterCategory: "", maxJobs: "100", scheduleTime: "06:00", schedule: "DAILY", filterDummy: true })
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ success: boolean; boards: Array<{ name: string; status: string }> } | null>(null)

  const fetchBoards = () => {
    fetch("/api/scraper/boards").then(r => r.json()).then(d => { setBoards(d); setLoading(false) })
  }

  useEffect(() => { fetchBoards() }, [])

  const feedTypes = ["RSS", "INDEED", "CV_LIBRARY", "MONSTER", "GOVUK"]
  const addBoard = async () => {
    await fetch("/api/scraper/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        boardType: form.type,
        feedUrl: feedTypes.includes(form.type) ? form.baseUrl : undefined,
        genericUrl: form.type === "GENERIC" ? form.baseUrl : undefined,
        apiKey: form.apiKey || undefined,
      }),
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
    setRunResult(prev => ({ ...prev, [id]: undefined as unknown as RunResult }))
    try {
      const res = await fetch(`/api/scraper/run/${id}`, { method: "POST" })
      const data = await res.json()
      setRunResult(prev => ({ ...prev, [id]: data }))
      fetchBoards()
    } finally {
      setRunning(null)
    }
  }

  const openFilterEditor = (board: JobBoard) => {
    setEditingFilters(board.id)
    setFilterForm({
      filterLocation: board.filterLocation || "",
      filterCategory: board.filterCategory || "",
      maxJobs: String(board.maxJobs || 100),
      scheduleTime: board.scheduleTime || "06:00",
      schedule: board.schedule || "DAILY",
      filterDummy: board.filterDummy !== false,
    })
  }

  const saveFilters = async (boardId: string) => {
    await fetch(`/api/scraper/boards/${boardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filterLocation: filterForm.filterLocation || null,
        filterCategory: filterForm.filterCategory || null,
        maxJobs: parseInt(filterForm.maxJobs) || 100,
        scheduleTime: filterForm.scheduleTime,
        schedule: filterForm.schedule,
        filterDummy: filterForm.filterDummy,
      }),
    })
    setEditingFilters(null)
    fetchBoards()
  }

  if (loading) return <><TopBar title="Job Scraper" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Job Scraper" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{boards.length} job boards configured</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={async () => {
              setSeeding(true); setSeedResult(null)
              const res = await fetch("/api/scraper/seed-uk", { method: "POST" })
              const data = await res.json()
              setSeedResult(data)
              setSeeding(false)
              fetchBoards()
            }} disabled={seeding}>
              <Globe className="h-4 w-4 mr-2" />{seeding ? "Setting up..." : "Seed UK Job Boards"}
            </Button>
            <Button onClick={() => setShowAdd(!showAdd)}><Plus className="h-4 w-4 mr-2" />Add Board</Button>
          </div>
        </div>

        {seedResult && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-green-700 mb-2">UK Job Boards Configured</p>
              <div className="space-y-1">
                {seedResult.boards?.map((b, i) => (
                  <p key={i} className="text-sm text-gray-600">
                    {b.status === "created" ? "✅" : "⏭️"} {b.name} — {b.status}
                  </p>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">Reed requires an API key. Edit the Reed board and add your key from reed.co.uk/developers</p>
            </CardContent>
          </Card>
        )}

        {showAdd && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input placeholder="Board name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="RSS">RSS Feed</option>
                <option value="INDEED">Indeed UK</option>
                <option value="CV_LIBRARY">CV-Library</option>
                <option value="MONSTER">Monster UK</option>
                <option value="GOVUK">GOV.UK Find a Job</option>
                <option value="REED">Reed API</option>
                <option value="ADZUNA">Adzuna API</option>
                <option value="GENERIC">Generic URL</option>
              </Select>
              <Input placeholder="Base URL / Feed URL" value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })} />
              {["REED", "ADZUNA"].includes(form.type) && (
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
                    <Badge className="bg-primary/10 text-primary">{board.boardType}</Badge>
                    <Badge className="bg-blue-50 text-blue-700 gap-1">
                      <Clock className="h-3 w-3" />{board.schedule} @ {board.scheduleTime}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-500">{board.feedUrl || board.genericUrl || "—"}</p>

                {/* Active filters display */}
                <div className="flex flex-wrap gap-2">
                  {board.filterLocation && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                      <MapPin className="h-3 w-3" />{board.filterLocation}
                    </span>
                  )}
                  {board.filterCategory && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                      <Tag className="h-3 w-3" />{board.filterCategory}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full">
                    Max: {board.maxJobs} jobs
                  </span>
                  {board.filterDummy && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                      <Shield className="h-3 w-3" />Dummy filter ON
                    </span>
                  )}
                </div>

                {/* Filter editor */}
                {editingFilters === board.id && (
                  <div className="border border-[#5B4FE8]/20 rounded-lg p-4 bg-[#5B4FE8]/5 space-y-3">
                    <p className="text-sm font-medium text-[#5B4FE8]">Filters & Schedule</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Location Filter</Label>
                        <Input placeholder="e.g. london, manchester, remote" value={filterForm.filterLocation} onChange={e => setFilterForm({ ...filterForm, filterLocation: e.target.value })} className="text-sm" />
                        <p className="text-xs text-gray-400 mt-1">Comma-separated. Jobs must match at least one.</p>
                      </div>
                      <div>
                        <Label className="text-xs">Category Filter</Label>
                        <Input placeholder="e.g. healthcare, technology, nursing" value={filterForm.filterCategory} onChange={e => setFilterForm({ ...filterForm, filterCategory: e.target.value })} className="text-sm" />
                        <p className="text-xs text-gray-400 mt-1">Matches against category, sector, or title.</p>
                      </div>
                      <div>
                        <Label className="text-xs">Max Jobs to Fetch</Label>
                        <Input type="number" min="1" max="500" value={filterForm.maxJobs} onChange={e => setFilterForm({ ...filterForm, maxJobs: e.target.value })} className="text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Schedule Time (UTC)</Label>
                        <Input type="time" value={filterForm.scheduleTime} onChange={e => setFilterForm({ ...filterForm, scheduleTime: e.target.value })} className="text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Frequency</Label>
                        <Select value={filterForm.schedule} onChange={e => setFilterForm({ ...filterForm, schedule: e.target.value })}>
                          <option value="HOURLY">Hourly</option>
                          <option value="DAILY">Daily</option>
                          <option value="WEEKLY">Weekly (Monday)</option>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <input type="checkbox" checked={filterForm.filterDummy} onChange={e => setFilterForm({ ...filterForm, filterDummy: e.target.checked })} id={`dummy-${board.id}`} />
                        <Label htmlFor={`dummy-${board.id}`} className="text-xs">Filter out dummy/spam jobs</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveFilters(board.id)}>Save Filters</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingFilters(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Run result */}
                {runResult[board.id] && (
                  <div className={`text-sm p-3 rounded-md ${runResult[board.id].success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {runResult[board.id].success ? (
                      <>Fetched {runResult[board.id].total} jobs &rarr; {runResult[board.id].rejected} rejected by filters &rarr; <strong>{runResult[board.id].created} new jobs created</strong></>
                    ) : (
                      <>Error: {runResult[board.id].error}</>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {board.lastFetchedAt ? `Last run: ${new Date(board.lastFetchedAt).toLocaleString()}${board.lastError ? ` (${board.lastError})` : " (Success)"}` : "Never run"}
                    {board.lastJobCount > 0 && ` | ${board.lastJobCount} jobs`}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openFilterEditor(board)} title="Filters & Schedule">
                      <Filter className="h-4 w-4" />
                    </Button>
                    {board.boardType === "RSS" && (
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

        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Automatic Scheduling</p>
            <p className="text-xs text-gray-500">
              Each board runs automatically at its scheduled time. Set up a cron job or external service to call
              <code className="bg-gray-100 px-1 mx-1 rounded">GET /api/scraper/cron</code>
              every hour. Protect it with the <code className="bg-gray-100 px-1 mx-1 rounded">CRON_SECRET</code> env variable.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
