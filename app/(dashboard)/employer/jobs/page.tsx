"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"

interface Job {
  id: string; title: string; location: string; sector: string; status: string
  jobType: string | null; salaryMin: number | null; salaryMax: number | null
  createdAt: string; _count: { applications: number }
  [key: string]: unknown
}

export default function EmployerJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => { fetch("/api/jobs").then((r) => r.json()).then(setJobs) }, [])

  async function closeJob(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" })
    setJobs(jobs.map((j) => j.id === id ? { ...j, status: "CLOSED" } : j))
  }

  const columns: Column<Job>[] = [
    { key: "title", label: "Title" },
    { key: "location", label: "Location" },
    { key: "sector", label: "Sector" },
    { key: "salary", label: "Salary", render: (r) => r.salaryMin || r.salaryMax ? `${r.salaryMin ? `£${(r.salaryMin / 1000).toFixed(0)}k` : ""} - ${r.salaryMax ? `£${(r.salaryMax / 1000).toFixed(0)}k` : ""}` : "—" },
    { key: "applications", label: "Applications", render: (r) => r._count?.applications || 0 },
    { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "ACTIVE" ? "default" : "secondary"}>{r.status}</Badge> },
    { key: "createdAt", label: "Posted", render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: "actions", label: "", sortable: false, render: (r) => r.status === "ACTIVE" ? (
      <button type="button" onClick={(e) => { e.stopPropagation(); closeJob(r.id) }} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
    ) : null },
  ]

  return (
    <>
      <TopBar title="My Jobs" notificationCount={0} />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => router.push("/employer/jobs/new")}><Plus className="h-4 w-4 mr-2" />Post New Job</Button>
        </div>
        <DataTable columns={columns} data={jobs} searchPlaceholder="Search jobs..." exportFilename="jobs" onRowClick={(r) => router.push(`/employer/jobs/${r.id}`)} />
      </div>
    </>
  )
}
