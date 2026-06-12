"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { TopBar } from "@/components/dashboard/TopBar"
import { MessageThread } from "@/components/messaging/MessageThread"
import { MessageSquare } from "lucide-react"

interface Application {
  id: string
  job: { title: string }
  jobSeeker?: { user: { name: string } } | null
  learner?: { user: { name: string } } | null
  _count: { messages: number }
}

export default function EmployerMessagesPage() {
  const { data: session } = useSession()
  const [apps, setApps] = useState<Application[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => { fetch("/api/applications").then((r) => r.json()).then(setApps) }, [])

  const threadsWithMessages = apps.filter((a) => a._count.messages > 0)

  return (
    <>
      <TopBar title="Messages" notificationCount={0} />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          <div className="border rounded-lg overflow-y-auto">
            <div className="p-3 border-b bg-gray-50 font-semibold text-sm">Threads</div>
            {threadsWithMessages.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No message threads</p>}
            {threadsWithMessages.map((app) => (
              <button key={app.id} type="button" onClick={() => setSelected(app.id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${selected === app.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                <p className="font-medium text-sm">{app.jobSeeker?.user.name || app.learner?.user.name || "Unknown"}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1"><MessageSquare className="h-3 w-3" />{app.job.title} · {app._count.messages} messages</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 border rounded-lg">
            {selected ? (
              <MessageThread applicationId={selected} currentUserId={session?.user?.id || ""} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">Select a thread to view messages</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
