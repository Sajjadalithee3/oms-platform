"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Briefcase } from "lucide-react"

interface CandidateDetail {
  id: string
  type: string
  user: { name: string; email: string }
  location: string
  skills: string
  phone: string
  profileComplete: number
  ragStatus?: string
  courseSector?: string
  provider?: string
  bio?: string
  desiredRole?: string
  desiredSalary?: number
  experience?: Array<{ title: string; company: string; startDate: string; endDate?: string }>
  education?: Array<{ institution: string; qualification: string; year: string }>
}

interface Match {
  id: string
  score: number
  job: { id: string; title: string; company: string; sector: string }
}

export default function StaffCandidateDetailPage() {
  const { id } = useParams()
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [matching, setMatching] = useState(false)

  useEffect(() => {
    fetch(`/api/candidates/profile?userId=${id}`).then(r => r.json()).then(d => {
      setCandidate(d)
      setLoading(false)
    })
  }, [id])

  const runMatching = async () => {
    if (!candidate) return
    setMatching(true)
    await fetch(`/api/matching/run-candidate/${candidate.id}`, { method: "POST" })
    setMatching(false)
  }

  if (loading) return <><TopBar title="Candidate Detail" /><div className="p-6 text-gray-500">Loading...</div></>
  if (!candidate) return <><TopBar title="Candidate Detail" /><div className="p-6 text-red-500">Candidate not found.</div></>

  const skills = candidate.skills ? candidate.skills.split(",") : []

  return (
    <>
      <TopBar title={`${candidate.user.name}`} />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Profile</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={candidate.type === "LEARNER" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                  {candidate.type === "LEARNER" ? "Learner" : "Job Seeker"}
                </Badge>
                {candidate.ragStatus && (
                  <Badge className={candidate.ragStatus === "GREEN" ? "bg-green-100 text-green-700" : candidate.ragStatus === "AMBER" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                    RAG: {candidate.ragStatus}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{candidate.user.email}</p></div>
            <div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{candidate.phone || "Not provided"}</p></div>
            <div><p className="text-sm text-gray-500">Location</p><p className="font-medium">{candidate.location || "Not provided"}</p></div>
            <div><p className="text-sm text-gray-500">Profile Complete</p><p className="font-medium">{candidate.profileComplete}%</p></div>
            {candidate.desiredRole && <div><p className="text-sm text-gray-500">Desired Role</p><p className="font-medium">{candidate.desiredRole}</p></div>}
            {candidate.courseSector && <div><p className="text-sm text-gray-500">Course Sector</p><p className="font-medium">{candidate.courseSector}</p></div>}
            {candidate.provider && <div><p className="text-sm text-gray-500">Provider</p><p className="font-medium">{candidate.provider}</p></div>}
          </CardContent>
        </Card>

        {candidate.bio && (
          <Card>
            <CardHeader><CardTitle>Bio</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-gray-600">{candidate.bio}</p></CardContent>
          </Card>
        )}

        {skills.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => <Badge key={s} className="bg-primary/10 text-primary">{s.trim()}</Badge>)}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />Job Matches</CardTitle>
              <Button size="sm" onClick={runMatching} disabled={matching}>
                {matching ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Run Matching
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <p className="text-sm text-gray-500">No matches yet. Click &quot;Run Matching&quot; to find suitable jobs.</p>
            ) : (
              <div className="space-y-2">
                {matches.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{m.job.title}</p>
                      <p className="text-xs text-gray-500">{m.job.company} | {m.job.sector}</p>
                    </div>
                    <Badge className={m.score >= 70 ? "bg-green-100 text-green-700" : m.score >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                      {m.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
