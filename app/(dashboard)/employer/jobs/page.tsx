"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
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
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => { fetch("/api/jobs").then((r) => r.json()).then(setJobs) }, [])

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

  const columns: Column<Job>[] = [
    { key: "title", label: "Title" },
    { key: "location", label: "Location" },
    { key: "sector", label: "Sector" },
    { key: "salary", label: "Salary", render: (r) => r.salaryMin || r.salaryMax ? `${r.salaryMin ? `£${(r.salaryMin / 1000).toFixed(0)}k` : ""} - ${r.salaryMax ? `£${(r.salaryMax / 1000).toFixed(0)}k` : ""}` : "—" },
    { key: "applications", label: "Applications", render: (r) => r._count?.applications || 0 },
    { key: "status", label: "Status", render: (r) => <Badge variant={r.status === "ACTIVE" ? "default" : "secondary"}>{r.status}</Badge> },
    { key: "createdAt", label: "Posted", render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: "actions", label: "", sortable: false, render: (r) => (
      <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }} className="text-red-400 hover:text-red-600" title="Delete job"><Trash2 className="h-4 w-4" /></button>
    ) },
  ]

  return (
    <>
      <TopBar title="My Jobs" notificationCount={0} />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-md px-4 py-2">
                <span className="text-sm font-medium text-red-800">{selectedIds.size} job{selectedIds.size !== 1 ? "s" : ""} selected</span>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-1" />Delete Selected
                </Button>
              </div>
            )}
          </div>
          <Button onClick={() => router.push("/employer/jobs/new")}><Plus className="h-4 w-4 mr-2" />Post New Job</Button>
        </div>
        <DataTable
          columns={columns}
          data={jobs}
          searchPlaceholder="Search jobs..."
          exportFilename="jobs"
          onRowClick={(r) => router.push(`/employer/jobs/${r.id}`)}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
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
