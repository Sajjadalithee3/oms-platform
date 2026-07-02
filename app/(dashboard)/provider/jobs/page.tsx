"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Trash2 } from "lucide-react"

interface Job {
  id: string
  title: string
  company: string
  location: string
  sector: string
  status: string
  sourceType: string
  salaryMin: number | null
  salaryMax: number | null
  createdAt: string
  [key: string]: unknown
}

export default function ProviderJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch("/api/jobs").then(r => r.json()).then(d => { setJobs(d); setLoading(false) })
  }, [])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/jobs/${deleteTarget.id}`, { method: "DELETE" })
    setJobs(prev => prev.filter(j => j.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
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
    { key: "sourceType", label: "Source", sortable: true, render: (r) => <Badge variant="outline">{r.sourceType}</Badge> },
    { key: "status", label: "Status", sortable: true, render: (r) => <Badge className={statusColor(r.status)}>{r.status}</Badge> },
    { key: "salary", label: "Salary", render: (r) => r.salaryMin || r.salaryMax ? `£${r.salaryMin ? (r.salaryMin / 1000).toFixed(0) + "k" : "?"} - £${r.salaryMax ? (r.salaryMax / 1000).toFixed(0) + "k" : "?"}` : "—" },
    { key: "createdAt", label: "Posted", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: "actions", label: "", sortable: false, render: (r) => (
      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }} className="text-red-400 hover:text-red-600" title="Delete job"><Trash2 className="h-4 w-4" /></button>
    ) },
  ]

  if (loading) return <><TopBar title="Job Board" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Job Board" />
      <div className="p-6">
        <DataTable columns={columns} data={jobs} exportFilename="jobs" searchPlaceholder="Search jobs..." />
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>&quot;{deleteTarget?.title}&quot;</strong>? This will also remove all applications and matches for this job. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
