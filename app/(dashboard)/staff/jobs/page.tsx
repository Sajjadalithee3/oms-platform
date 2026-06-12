"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Target } from "lucide-react"

interface Job {
  id: string
  title: string
  company: string
  sector: string
  location: string
  status: string
  createdAt: string
}

export default function StaffJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [matchingJob, setMatchingJob] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/jobs").then(r => r.json()).then(d => { setJobs(d); setLoading(false) })
  }, [])

  const runJobMatching = async (jobId: string) => {
    setMatchingJob(jobId)
    await fetch(`/api/matching/run-job/${jobId}`, { method: "POST" })
    setMatchingJob(null)
  }

  const statusColor = (s: string) => {
    if (s === "ACTIVE") return "bg-green-100 text-green-700"
    if (s === "CLOSED") return "bg-red-100 text-red-700"
    return "bg-gray-100 text-gray-700"
  }

  const columns: Column<Job>[] = [
    { key: "title", label: "Title", sortable: true },
    { key: "company", label: "Company", sortable: true },
    { key: "sector", label: "Sector", sortable: true },
    { key: "location", label: "Location", sortable: true },
    { key: "status", label: "Status", sortable: true, render: (r) => <Badge className={statusColor(r.status)}>{r.status}</Badge> },
    { key: "createdAt", label: "Posted", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: "actions", label: "Match", render: (r) => (
      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); runJobMatching(r.id) }} disabled={matchingJob === r.id}>
        {matchingJob === r.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
      </Button>
    )},
  ]

  if (loading) return <><TopBar title="All Jobs" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="All Jobs" />
      <div className="p-6">
        <DataTable columns={columns} data={jobs} exportFilename="jobs" searchPlaceholder="Search jobs..." />
      </div>
    </>
  )
}
