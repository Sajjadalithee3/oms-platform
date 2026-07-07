"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { TopBar } from "@/components/dashboard/TopBar"
import { MessageThread } from "@/components/messaging/MessageThread"
import { InterviewScheduler } from "@/components/interviews/InterviewScheduler"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

interface AppDetail {
  id: string; status: string; matchScore: number | null; coverNote: string | null; createdAt: string
  job: { title: string; company: string; location: string; sector: string }
  interviews: Array<{ id: string; proposedSlots: string; confirmedSlot: string | null; status: string; location: string | null; meetingLink: string | null; notes: string | null }>
}

export default function JobSeekerApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [app, setApp] = useState<AppDetail | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadApp() }, [params.id])
  function loadApp() { fetch(`/api/applications/${params.id}`).then((r) => r.json()).then(setApp) }

  if (!app) return <div className="p-6">Loading...</div>

  return (
    <>
      <TopBar title={`Application: ${app.job.title}`} notificationCount={0} />
      <div className="p-6 space-y-6">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" />Back</button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="font-bold text-lg">{app.job.title}</h2>
              <p className="text-gray-600">{app.job.company} · {app.job.location}</p>
              <div className="flex gap-2 mt-3"><Badge>{app.status}</Badge>{app.matchScore !== null && <Badge variant="outline">{app.matchScore}% match</Badge>}</div>
              {app.coverNote && <p className="mt-3 text-sm text-gray-600">{app.coverNote}</p>}
              <p className="text-xs text-gray-400 mt-2">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-3">Messages</h3>
              <MessageThread applicationId={app.id} currentUserId={session?.user?.id || ""} />
            </div>
          </div>
          <div>
            <InterviewScheduler applicationId={app.id} interview={app.interviews[0] || null} isEmployer={false} onUpdate={loadApp} />
          </div>
        </div>
      </div>
    </>
  )
}
