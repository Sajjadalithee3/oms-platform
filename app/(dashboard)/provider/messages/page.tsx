"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare } from "lucide-react"

interface Thread {
  id: string
  jobTitle: string
  candidateName: string
  employerName: string
  status: string
  lastMessage: string
  lastMessageTime: string
}

export default function ProviderMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [messages, setMessages] = useState<Array<{ id: string; content: string; senderName: string; createdAt: string }>>([])

  useSession()

  useEffect(() => {
    fetch("/api/applications").then(r => r.json()).then(apps => {
      const t = (apps || []).map((a: Record<string, unknown>) => ({
        id: a.id,
        jobTitle: (a.job as Record<string, unknown>)?.title || "Unknown",
        candidateName: (a.learner as Record<string, unknown>)?.user ? ((a.learner as Record<string, unknown>).user as Record<string, unknown>).name : "Unknown",
        employerName: ((a.job as Record<string, unknown>)?.employer as Record<string, unknown>)?.companyName || "Unknown",
        status: a.status,
        lastMessage: "",
        lastMessageTime: a.createdAt as string,
      }))
      setThreads(t)
      setLoading(false)
    })
  }, [])

  const loadMessages = async (appId: string) => {
    setSelectedThread(appId)
    const res = await fetch(`/api/messages/${appId}`)
    const data = await res.json()
    setMessages(data || [])
  }

  if (loading) return <><TopBar title="Messages" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Messages (Read Only)" />
      <div className="p-6">
        <p className="text-sm text-gray-500 mb-4">View message threads between your learners and employers. Providers have read-only access.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            {threads.map(t => (
              <Card key={t.id} className={`cursor-pointer transition-colors ${selectedThread === t.id ? "border-primary" : "hover:border-gray-300"}`} onClick={() => loadMessages(t.id)}>
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-[#1A1A2E]">{t.candidateName}</p>
                  <p className="text-xs text-gray-500">{t.jobTitle} at {t.employerName}</p>
                  <Badge className="mt-1 bg-primary/10 text-primary text-xs">{t.status}</Badge>
                </CardContent>
              </Card>
            ))}
            {threads.length === 0 && <p className="text-sm text-gray-500">No message threads found.</p>}
          </div>
          <div className="lg:col-span-2">
            {selectedThread ? (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {messages.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No messages in this thread yet.</p>
                    ) : (
                      messages.map(m => (
                        <div key={m.id} className="p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-[#1A1A2E]">{m.senderName}</p>
                            <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</p>
                          </div>
                          <p className="text-sm text-gray-600">{m.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                <div className="text-center text-gray-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p>Select a thread to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
