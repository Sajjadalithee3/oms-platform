"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MatchBadge } from "@/components/shared/MatchBadge"
import { ArrowLeft, MapPin, Briefcase, Clock } from "lucide-react"

interface Application {
  id: string; status: string; matchScore: number | null; createdAt: string
  jobSeeker?: { user: { name: string }; skills: string } | null
  learner?: { user: { name: string }; skills: string } | null
}

interface Job {
  id: string; title: string; company: string; location: string; sector: string; description: string
  requiredSkills: string; status: string; jobType: string | null; salaryMin: number | null; salaryMax: number | null
  applications: Application[]
}

export default function EmployerJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)

  useEffect(() => { fetch(`/api/jobs/${params.id}`).then((r) => r.json()).then(setJob) }, [params.id])

  async function updateStatus(appId: string, status: string) {
    await fetch(`/api/applications/${appId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    setJob((j) => j ? { ...j, applications: j.applications.map((a) => a.id === appId ? { ...a, status } : a) } : j)
  }

  if (!job) return <div className="p-6">Loading...</div>

  const skills: string[] = JSON.parse(job.requiredSkills || "[]")

  return (
    <>
      <TopBar title={job.title} notificationCount={0} />
      <div className="p-6 space-y-6">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" />Back to Jobs
        </button>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{job.title}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
                <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{job.sector}</span>
                {job.jobType && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.jobType}</span>}
              </div>
            </div>
            <Badge variant={job.status === "ACTIVE" ? "default" : "secondary"}>{job.status}</Badge>
          </div>
          {skills.length > 0 && <div className="flex flex-wrap gap-1 mt-4">{skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div>}
          <p className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Applicants ({job.applications.length})</h3>
          {job.applications.length === 0 && <p className="text-sm text-gray-400">No applications yet</p>}
          <div className="space-y-3">
            {job.applications.map((app) => {
              const name = app.jobSeeker?.user.name || app.learner?.user.name || "Unknown"
              return (
                <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">{name.charAt(0)}</div>
                    <div>
                      <p className="font-medium text-sm">{name}</p>
                      <p className="text-xs text-gray-500">{app.status} · {new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.matchScore !== null && <MatchBadge score={app.matchScore} matchedSkills={[]} missingSkills={[]} />}
                    <Badge variant="outline">{app.status}</Badge>
                    {app.status === "APPLIED" && (
                      <>
                        <Button size="sm" onClick={() => updateStatus(app.id, "SHORTLISTED")}>Shortlist</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(app.id, "REJECTED")}>Reject</Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => router.push(`/employer/applications/${app.id}`)}>View</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
