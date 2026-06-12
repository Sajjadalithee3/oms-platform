"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"

interface Course { id: string; name: string }
interface Cohort {
  id: string; name: string; courseId: string; course: Course
  startDate: string | null; endDate: string | null
  expectedLearners: number; _count: { learners: number }
  [key: string]: unknown
}

export default function ProviderCohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ courseId: "", name: "", startDate: "", endDate: "", expectedLearners: "" })

  useEffect(() => {
    fetch("/api/providers/cohorts").then((r) => r.json()).then(setCohorts)
    fetch("/api/providers/courses").then((r) => r.json()).then(setCourses)
  }, [])

  async function createCohort() {
    const res = await fetch("/api/providers/cohorts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, expectedLearners: parseInt(form.expectedLearners) || 0 }),
    })
    if (res.ok) {
      setDialogOpen(false); setForm({ courseId: "", name: "", startDate: "", endDate: "", expectedLearners: "" })
      const data = await fetch("/api/providers/cohorts").then((r) => r.json()); setCohorts(data)
    }
  }

  async function deleteCohort(id: string) {
    await fetch(`/api/providers/cohorts?id=${id}`, { method: "DELETE" })
    setCohorts(cohorts.filter((c) => c.id !== id))
  }

  const columns: Column<Cohort>[] = [
    { key: "name", label: "Cohort Name" },
    { key: "course", label: "Course", render: (row) => row.course?.name || "—" },
    { key: "startDate", label: "Start", render: (row) => row.startDate ? new Date(row.startDate).toLocaleDateString() : "—" },
    { key: "endDate", label: "End", render: (row) => row.endDate ? new Date(row.endDate).toLocaleDateString() : "—" },
    { key: "expectedLearners", label: "Expected" },
    { key: "actual", label: "Actual", render: (row) => row._count?.learners || 0 },
    { key: "actions", label: "Actions", sortable: false, render: (row) => (
      <button type="button" onClick={(e) => { e.stopPropagation(); deleteCohort(row.id) }} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
    )},
  ]

  return (
    <>
      <TopBar title="Cohorts" notificationCount={0} />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Cohort</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Cohort</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Course</Label><Select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}><option value="">Select course...</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
                <div><Label>Cohort Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jan 2026 Intake" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
                <div><Label>Expected Learners</Label><Input type="number" value={form.expectedLearners} onChange={(e) => setForm({ ...form, expectedLearners: e.target.value })} /></div>
                <Button onClick={createCohort} disabled={!form.courseId || !form.name} className="w-full">Create Cohort</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <DataTable columns={columns} data={cohorts} searchPlaceholder="Search cohorts..." exportFilename="cohorts" />
      </div>
    </>
  )
}
