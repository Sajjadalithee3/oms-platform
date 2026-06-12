"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"

interface Job {
  id: string
  title: string
  company: string
  sector: string
  location: string
  status: string
  salaryMin: number | null
  salaryMax: number | null
  createdAt: string
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/jobs").then(r => r.json()).then(d => { setJobs(d); setLoading(false) })
  }, [])

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
    { key: "salary", label: "Salary", render: (r) => r.salaryMin ? `£${r.salaryMin.toLocaleString()} - £${(r.salaryMax || r.salaryMin).toLocaleString()}` : "Not specified" },
    { key: "createdAt", label: "Posted", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ]

  if (loading) return <><TopBar title="All Jobs" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="All Jobs" />
      <div className="p-6">
        <DataTable columns={columns} data={jobs} exportFilename="all-jobs" searchPlaceholder="Search jobs..." />
      </div>
    </>
  )
}
