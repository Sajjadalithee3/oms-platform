"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { TopBar } from "@/components/dashboard/TopBar"
import { MessageThread } from "@/components/messaging/MessageThread"
import { InterviewScheduler } from "@/components/interviews/InterviewScheduler"
import { MatchBadge } from "@/components/shared/MatchBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, User, Mail, MapPin } from "lucide-react"

interface ApplicationDetail {
  id: string; status: string; matchScore: number | null; coverNote: string | null; createdAt: string
  job: { title: string; company: string }
  jobSeeker?: { id: string; user: { name: string; email: string }; skills: string; location: string | null; headline: string | null; experiences: Array<{ title: string; company: string }> } | null
  learner?: { id: string; user: { name: string; email: string }; skills: string; location: string | null; courseName: string | null; experiences: Array<{ title: string; company: string }> } | null
  interviews: Array<{ id: string; proposedSlots: string; confirmedSlot: string | null; status: string; location: string | null; meetingLink: string | null; notes: string | null }>
}

export default function EmployerApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [app, setApp] = useState<ApplicationDetail | null>(null)

  useEffect(() => { loadApp() }, [params.id])

  function loadApp() { fetch(`/api/applications/${params.id}`).then((r) => r.json()).then(setApp) }

  async function updateStatus(status: string) {
    await fetch(`/api/applications/${params.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    loadApp()
  }

  if (!app) return <div className="p-6">Loading...</div>

  const candidate = app.jobSeeker || app.learner
  const skills: string[] = candidate ? JSON.parse(candidate.skills || "[]") : []
  const interview = app.interviews[0] || null

  return (
    <>
      <TopBar title={`Application: ${app.job.title}`} notificationCount={0} />
      <div className="p-6 space-y-6">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" />Back</button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {candidate?.user.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">{candidate?.user.name}</h2>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{candidate?.user.email}</span>
                        {candidate?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{candidate.location}</span>}
                      </div>
                    </div>
                  </div>
                  {app.learner?.courseName && <p className="text-sm text-gray-500 mt-2"><User className="h-3 w-3 inline mr-1" />Learner: {app.learner.courseName}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {app.matchScore !== null && <MatchBadge score={app.matchScore} matchedSkills={[]} missingSkills={[]} />}
                  <Badge>{app.status}</Badge>
                </div>
              </div>

              {skills.length > 0 && <div className="mt-4"><p className="text-sm font-medium text-gray-700 mb-1">Skills</p><div className="flex flex-wrap gap-1">{skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}</div></div>}

              {candidate?.experiences && candidate.experiences.length > 0 && (
                <div className="mt-4"><p className="text-sm font-medium text-gray-700 mb-1">Experience</p>
                  {candidate.experiences.map((exp, i) => <p key={i} className="text-sm text-gray-600">{exp.title} at {exp.company}</p>)}
                </div>
              )}

              {app.coverNote && <div className="mt-4"><p className="text-sm font-medium text-gray-700 mb-1">Cover Note</p><p className="text-sm text-gray-600">{app.coverNote}</p></div>}

              <div className="flex gap-2 mt-6">
                {app.status === "APPLIED" && <><Button onClick={() => updateStatus("SHORTLISTED")}>Shortlist</Button><Button variant="outline" onClick={() => updateStatus("REJECTED")}>Reject</Button></>}
                {app.status === "SHORTLISTED" && <Button onClick={() => updateStatus("INTERVIEW")}>Move to Interview</Button>}
                {app.status === "INTERVIEW" && <><Button onClick={() => updateStatus("OFFER")}>Send Offer</Button><Button variant="outline" onClick={() => updateStatus("REJECTED")}>Reject</Button></>}
                {app.status === "OFFER" && <Button onClick={() => updateStatus("PLACED")}>Mark as Placed</Button>}
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-3">Messages</h3>
              <MessageThread applicationId={app.id} currentUserId={session?.user?.id || ""} />
            </div>
          </div>

          <div>
            <InterviewScheduler applicationId={app.id} interview={interview} isEmployer={true} onUpdate={loadApp} />
          </div>
        </div>
      </div>
    </>
  )
}
