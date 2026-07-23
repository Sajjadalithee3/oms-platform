"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { MatchBadge } from "@/components/shared/MatchBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { MapPin, Briefcase, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"

interface Job {
  id: string; title: string; company: string; location: string; sector: string
  jobType: string | null; salaryMin: number | null; salaryMax: number | null
  sourceType: string; sourceUrl: string | null; status: string; createdAt: string; isRemote: boolean
}

interface Match { jobId: string; matchScore: number; matchedSkills: string; missingSkills: string }

const PAGE_SIZE = 12

export default function JobSeekerJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [matches, setMatches] = useState<Record<string, Match>>({})
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([])
  const [search, setSearch] = useState("")
  const [sectorFilter, setSectorFilter] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [sortBy, setSortBy] = useState("match")
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetch("/api/jobs").then((r) => r.json()).then(setJobs)
    fetch("/api/sectors").then((r) => r.json()).then(setSectors)
    fetch("/api/candidates/profile").then(async (r) => {
      if (r.ok) {
        const profile = await r.json()
        const matchRes = await fetch(`/api/matching/run-candidate/${profile.id}`, { method: "POST" })
        if (matchRes.ok) {
          const data = await matchRes.json()
          const map: Record<string, Match> = {}
          for (const m of data.matches || []) map[m.jobId] = m
          setMatches(map)
        }
      }
    })
  }, [])

  useEffect(() => { setPage(0) }, [search, sectorFilter, locationFilter, sortBy])

  let filtered = jobs.filter((j) => j.status === "ACTIVE")
  if (search) filtered = filtered.filter((j) => j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase()))
  if (sectorFilter) filtered = filtered.filter((j) => j.sector === sectorFilter)
  if (locationFilter) filtered = filtered.filter((j) => j.location.toLowerCase().includes(locationFilter.toLowerCase()))

  if (sortBy === "match") filtered.sort((a, b) => (matches[b.id]?.matchScore || 0) - (matches[a.id]?.matchScore || 0))
  else if (sortBy === "date") filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  else if (sortBy === "salary") filtered.sort((a, b) => (b.salaryMax || 0) - (a.salaryMax || 0))

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <>
      <TopBar title="Job Board" notificationCount={0} />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." className="max-w-sm" />
          <Select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className="max-w-[200px]">
            <option value="">All Sectors</option>
            {sectors.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </Select>
          <Input value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Location..." className="max-w-[180px]" />
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="max-w-[180px]">
            <option value="match">Sort by Match %</option>
            <option value="date">Sort by Date</option>
            <option value="salary">Sort by Salary</option>
          </Select>
        </div>

        <p className="text-sm text-gray-500">{filtered.length} job{filtered.length !== 1 ? "s" : ""} found</p>

        <div className="grid gap-4">
          {paged.map((job) => {
            const match = matches[job.id]
            const matchedSkills: string[] = match ? JSON.parse(match.matchedSkills) : []
            const missingSkills: string[] = match ? JSON.parse(match.missingSkills) : []
            return (
              <div key={job.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/jobseeker/jobs/${job.id}`)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-sm text-gray-600">{job.company}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.sector}</span>
                      {job.jobType && <span>{job.jobType}</span>}
                      {job.isRemote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                      {(job.salaryMin || job.salaryMax) && <span>£{job.salaryMin ? `${(job.salaryMin/1000).toFixed(0)}k` : "?"} - £{job.salaryMax ? `${(job.salaryMax/1000).toFixed(0)}k` : "?"}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {match && <MatchBadge score={match.matchScore} matchedSkills={matchedSkills} missingSkills={missingSkills} />}
                    {job.sourceType !== "INTERNAL" && <Badge variant="outline" className="flex items-center gap-1"><ExternalLink className="h-3 w-3" />{job.sourceType}</Badge>}
                  </div>
                </div>
                {matchedSkills.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{matchedSkills.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>}
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No jobs found</p>}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-500">
              {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(0, Math.min(page - 2, totalPages - 5))
                const pageNum = start + i
                return (
                  <Button key={pageNum} variant={pageNum === page ? "default" : "outline"} size="sm" onClick={() => setPage(pageNum)} className="min-w-[36px]">
                    {pageNum + 1}
                  </Button>
                )
              })}
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
