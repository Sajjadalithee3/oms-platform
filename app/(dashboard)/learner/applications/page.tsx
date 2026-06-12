"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { MatchBadge } from "@/components/shared/MatchBadge"

interface Application {
  id: string; status: string; matchScore: number | null; createdAt: string
  job: { title: string; company: string; location: string }
  _count: { messages: number }
  [key: string]: unknown
}

const statusColors: Record<string, string> = {
  APPLIED: "bg-blue-100 text-blue-700", SHORTLISTED: "bg-purple-100 text-purple-700",
  INTERVIEW: "bg-amber-100 text-amber-700", OFFER: "bg-green-100 text-green-700",
  PLACED: "bg-green-200 text-green-800", REJECTED: "bg-red-100 text-red-700",
}

export default function LearnerApplicationsPage() {
  const router = useRouter()
  const [apps, setApps] = useState<Application[]>([])
  useEffect(() => { fetch("/api/applications").then((r) => r.json()).then(setApps) }, [])

  const columns: Column<Application>[] = [
    { key: "job", label: "Job", render: (r) => r.job.title },
    { key: "company", label: "Company", render: (r) => r.job.company },
    { key: "matchScore", label: "Match", render: (r) => r.matchScore !== null ? <MatchBadge score={r.matchScore} matchedSkills={[]} missingSkills={[]} /> : "—" },
    { key: "status", label: "Status", render: (r) => <Badge className={statusColors[r.status] || ""}>{r.status}</Badge> },
    { key: "messages", label: "Messages", render: (r) => r._count.messages },
    { key: "createdAt", label: "Applied", render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ]

  return (
    <>
      <TopBar title="My Applications" notificationCount={0} />
      <div className="p-6">
        <DataTable columns={columns} data={apps} searchPlaceholder="Search applications..." onRowClick={(r) => router.push(`/learner/applications/${r.id}`)} />
      </div>
    </>
  )
}
