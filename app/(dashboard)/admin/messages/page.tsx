"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"

interface MessageThread {
  id: string
  jobTitle: string
  candidateName: string
  employerName: string
  status: string
  messageCount: number
  lastMessage: string
}

export default function AdminMessagesPage() {
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/applications?includeMessages=1").then(r => r.json()).then(apps => {
      const t = (apps || []).map((a: Record<string, unknown>) => ({
        id: a.id,
        jobTitle: (a.job as Record<string, unknown>)?.title || "Unknown",
        candidateName: (a.jobSeeker as Record<string, unknown>)?.user ? ((a.jobSeeker as Record<string, unknown>).user as Record<string, unknown>).name : (a.learner as Record<string, unknown>)?.user ? ((a.learner as Record<string, unknown>).user as Record<string, unknown>).name : "Unknown",
        employerName: ((a.job as Record<string, unknown>)?.employer as Record<string, unknown>)?.companyName || "Unknown",
        status: a.status,
        messageCount: Array.isArray(a.messages) ? a.messages.length : 0,
        lastMessage: Array.isArray(a.messages) && a.messages.length > 0 ? new Date((a.messages[a.messages.length - 1] as Record<string, unknown>).createdAt as string).toLocaleString() : "No messages",
      }))
      setThreads(t)
      setLoading(false)
    })
  }, [])

  const columns: Column<MessageThread>[] = [
    { key: "jobTitle", label: "Job", sortable: true },
    { key: "candidateName", label: "Candidate", sortable: true },
    { key: "employerName", label: "Employer", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "messageCount", label: "Messages", sortable: true },
    { key: "lastMessage", label: "Last Message", sortable: true },
  ]

  if (loading) return <><TopBar title="Messages (Read Only)" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Messages (Read Only)" />
      <div className="p-6">
        <p className="text-sm text-gray-500 mb-4">Overview of all application message threads across the platform.</p>
        <DataTable columns={columns} data={threads} exportFilename="messages" searchPlaceholder="Search threads..." />
      </div>
    </>
  )
}
