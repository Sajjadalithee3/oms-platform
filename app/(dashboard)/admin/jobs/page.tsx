"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  sector: string
  location: string
  status: string
  sourceType: string
  salaryMin: number | null
  salaryMax: number | null
  createdAt: string
}

export default function AdminJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const fetchJobs = () => {
    fetch("/api/jobs").then(r => r.json()).then(d => { setJobs(d); setLoading(false) })
  }

  useEffect(() => { fetchJobs() }, [])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/jobs/${deleteTarget.id}`, { method: "DELETE" })
    setJobs(prev => prev.filter(j => j.id !== deleteTarget.id))
    setSelectedIds(prev => { const next = new Set(prev); next.delete(deleteTarget.id); return next })
    setDeleteTarget(null)
    setDeleting(false)
  }

  const confirmBulkDelete = async () => {
    setBulkDeleting(true)
    const res = await fetch("/api/jobs/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobIds: Array.from(selectedIds) }),
    })
    if (res.ok) {
      setJobs(prev => prev.filter(j => !selectedIds.has(j.id)))
      setSelectedIds(new Set())
    }
    setBulkDeleting(false)
    setBulkDeleteOpen(false)
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
    { key: "salary", label: "Salary", render: (r) => r.salaryMin ? `£${r.salaryMin.toLocaleString()} - £${(r.salaryMax || r.salaryMin).toLocaleString()}` : "Not specified" },
    { key: "createdAt", label: "Posted", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: "actions", label: "", sortable: false, render: (r) => (
      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }} className="text-red-400 hover:text-red-600" title="Delete job"><Trash2 className="h-4 w-4" /></button>
    ) },
  ]

  if (loading) return <><TopBar title="All Jobs" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="All Jobs" />
      <div className="p-6 space-y-4">
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-md px-4 py-3">
            <span className="text-sm font-medium text-red-800">{selectedIds.size} job{selectedIds.size !== 1 ? "s" : ""} selected</span>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" />Delete Selected
            </Button>
          </div>
        )}
        <DataTable
          columns={columns}
          data={jobs}
          exportFilename="all-jobs"
          searchPlaceholder="Search jobs..."
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(r) => router.push(`/admin/jobs/${r.id}`)}
        />
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>&quot;{deleteTarget?.title}&quot;</strong>? This will also remove all applications, matches, and messages associated with this job. This action cannot be undone.
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

      <Dialog open={bulkDeleteOpen} onOpenChange={(open) => { if (!open) setBulkDeleteOpen(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Jobs</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{selectedIds.size} job{selectedIds.size !== 1 ? "s" : ""}</strong>? This will also remove all applications, matches, interviews, and messages associated with these jobs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? "Deleting..." : `Delete ${selectedIds.size} Jobs`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
