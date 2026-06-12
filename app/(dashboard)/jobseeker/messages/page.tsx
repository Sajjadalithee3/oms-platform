"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { TopBar } from "@/components/dashboard/TopBar"
import { MessageThread } from "@/components/messaging/MessageThread"
import { MessageSquare } from "lucide-react"

interface Application {
  id: string; job: { title: string; company: string }; _count: { messages: number }
}

export default function JobSeekerMessagesPage() {
  const { data: session } = useSession()
  const [apps, setApps] = useState<Application[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => { fetch("/api/applications").then((r) => r.json()).then(setApps) }, [])

  const threads = apps.filter((a) => a._count.messages > 0)

  return (
    <>
      <TopBar title="Messages" notificationCount={0} />
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          <div className="border rounded-lg overflow-y-auto">
            <div className="p-3 border-b bg-gray-50 font-semibold text-sm">Threads</div>
            {threads.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No messages yet</p>}
            {threads.map((a) => (
              <button key={a.id} type="button" onClick={() => setSelected(a.id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${selected === a.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                <p className="font-medium text-sm">{a.job.company}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1"><MessageSquare className="h-3 w-3" />{a.job.title} · {a._count.messages} messages</p>
              </button>
            ))}
          </div>
          <div className="lg:col-span-2 border rounded-lg">
            {selected ? <MessageThread applicationId={selected} currentUserId={session?.user?.id || ""} /> : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Select a thread</div>}
          </div>
        </div>
      </div>
    </>
  )
}
