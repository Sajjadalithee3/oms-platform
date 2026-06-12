"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MatchBadge } from "@/components/shared/MatchBadge"
import { ArrowLeft, MapPin, Briefcase, Clock, ExternalLink } from "lucide-react"

interface Job {
  id: string; title: string; company: string; location: string; sector: string; description: string
  requiredSkills: string; jobType: string | null; salaryMin: number | null; salaryMax: number | null
  sourceType: string; sourceUrl: string | null; status: string; isRemote: boolean
}

export default function JobSeekerJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [coverNote, setCoverNote] = useState("")
  const [applied, setApplied] = useState(false)
  const [applying, setApplying] = useState(false)
  const [matchScore, setMatchScore] = useState<number | null>(null)
  const [matchedSkills, setMatchedSkills] = useState<string[]>([])
  const [missingSkills, setMissingSkills] = useState<string[]>([])

  useEffect(() => {
    fetch(`/api/jobs/${params.id}`).then((r) => r.json()).then(setJob)
    fetch("/api/applications").then(async (r) => {
      if (r.ok) {
        const apps = await r.json()
        if (apps.some((a: { jobId: string }) => a.jobId === params.id)) setApplied(true)
      }
    })
  }, [params.id])

  useEffect(() => {
    if (!job) return
    fetch("/api/candidates/profile").then(async (r) => {
      if (r.ok) {
        const profile = await r.json()
        const res = await fetch(`/api/matching/run-candidate/${profile.id}`, { method: "POST" })
        if (res.ok) {
          const data = await res.json()
          const m = data.matches?.find((m: { jobId: string }) => m.jobId === job.id)
          if (m) { setMatchScore(m.matchScore); setMatchedSkills(JSON.parse(m.matchedSkills || "[]")); setMissingSkills(JSON.parse(m.missingSkills || "[]")) }
        }
      }
    })
  }, [job])

  async function apply() {
    setApplying(true)
    const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: params.id, coverNote }) })
    if (res.ok) setApplied(true)
    setApplying(false)
  }

  if (!job) return <div className="p-6">Loading...</div>

  const skills: string[] = JSON.parse(job.requiredSkills || "[]")

  return (
    <>
      <TopBar title={job.title} notificationCount={0} />
      <div className="p-6 max-w-3xl space-y-6">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" />Back</button>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{job.title}</h2>
              <p className="text-gray-600">{job.company}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
                <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{job.sector}</span>
                {job.jobType && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.jobType}</span>}
                {job.isRemote && <Badge variant="outline">Remote</Badge>}
              </div>
            </div>
            {matchScore !== null && <MatchBadge score={matchScore} matchedSkills={matchedSkills} missingSkills={missingSkills} />}
          </div>

          {skills.length > 0 && (
            <div className="mt-4"><p className="text-sm font-medium mb-1">Required Skills</p>
              <div className="flex flex-wrap gap-1">{skills.map((s) => <Badge key={s} variant={matchedSkills.includes(s) ? "default" : "outline"}>{s}</Badge>)}</div>
            </div>
          )}

          {(job.salaryMin || job.salaryMax) && <p className="mt-3 text-sm text-gray-600">Salary: £{job.salaryMin?.toLocaleString() || "?"} - £{job.salaryMax?.toLocaleString() || "?"}</p>}

          <div className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">{job.description}</div>

          <div className="mt-6">
            {job.status === "CLOSED" ? (
              <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">This role is no longer accepting applications.</div>
            ) : applied ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-green-700">You have already applied</div>
            ) : job.sourceType !== "INTERNAL" ? (
              <a href={job.sourceUrl || "#"} target="_blank" rel="noopener noreferrer"><Button className="w-full"><ExternalLink className="h-4 w-4 mr-2" />Apply on {job.sourceType}</Button></a>
            ) : (
              <div className="space-y-3">
                <Textarea value={coverNote} onChange={(e) => setCoverNote(e.target.value)} placeholder="Cover note (optional)..." rows={3} />
                <Button onClick={apply} disabled={applying} className="w-full">Apply Now</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
