"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Video } from "lucide-react"

interface Interview {
  id: string; status: string; confirmedSlot: string | null; proposedSlots: string
  location: string | null; meetingLink: string | null
  application: { job: { title: string }; jobSeeker?: { user: { name: string } } | null; learner?: { user: { name: string } } | null }
  [key: string]: unknown
}

const statusColors: Record<string, string> = { PENDING: "bg-amber-100 text-amber-700", CONFIRMED: "bg-green-100 text-green-700", COMPLETED: "bg-blue-100 text-blue-700", CANCELLED: "bg-red-100 text-red-700" }

export default function EmployerInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  useEffect(() => { fetch("/api/interviews").then((r) => r.json()).then(setInterviews) }, [])

  const columns: Column<Interview>[] = [
    { key: "candidate", label: "Candidate", render: (r) => r.application.jobSeeker?.user.name || r.application.learner?.user.name || "—" },
    { key: "job", label: "Job", render: (r) => r.application.job.title },
    { key: "date", label: "Date", render: (r) => r.confirmedSlot ? (
      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.confirmedSlot).toLocaleDateString()} {new Date(r.confirmedSlot).toLocaleTimeString()}</span>
    ) : "Awaiting confirmation" },
    { key: "location", label: "Location", render: (r) => r.meetingLink ? <span className="flex items-center gap-1"><Video className="h-3 w-3" />Online</span> : r.location ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span> : "—" },
    { key: "status", label: "Status", render: (r) => <Badge className={statusColors[r.status] || ""}>{r.status}</Badge> },
  ]

  return (
    <>
      <TopBar title="Interviews" notificationCount={0} />
      <div className="p-6">
        <DataTable columns={columns} data={interviews} searchPlaceholder="Search interviews..." exportFilename="interviews" />
      </div>
    </>
  )
}
