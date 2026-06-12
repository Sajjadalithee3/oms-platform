"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"

interface Course {
  id: string
  name: string
  sector: string
  requiredSkills: string
  duration: string | null
  description: string | null
  isActive: boolean
  cohorts: Array<{ _count: { learners: number } }>
  [key: string]: unknown
}

export default function ProviderCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", sector: "", duration: "", description: "" })
  const [skillInput, setSkillInput] = useState("")
  const [skills, setSkills] = useState<string[]>([])

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    const res = await fetch("/api/providers/courses")
    if (res.ok) setCourses(await res.json())
  }

  async function createCourse() {
    const res = await fetch("/api/providers/courses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, requiredSkills: skills }),
    })
    if (res.ok) { setDialogOpen(false); setForm({ name: "", sector: "", duration: "", description: "" }); setSkills([]); loadCourses() }
  }

  async function deleteCourse(id: string) {
    await fetch(`/api/providers/courses?id=${id}`, { method: "DELETE" })
    loadCourses()
  }

  const columns: Column<Course>[] = [
    { key: "name", label: "Course Name" },
    { key: "sector", label: "Sector" },
    { key: "duration", label: "Duration" },
    {
      key: "cohorts", label: "Cohorts", sortable: false,
      render: (row) => row.cohorts?.length || 0,
    },
    {
      key: "learnerCount", label: "Learners", sortable: false,
      render: (row) => row.cohorts?.reduce((sum, c) => sum + (c._count?.learners || 0), 0) || 0,
    },
    {
      key: "isActive", label: "Status",
      render: (row) => row.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>,
    },
    {
      key: "actions", label: "Actions", sortable: false,
      render: (row) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); deleteCourse(row.id) }} className="text-red-400 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <>
      <TopBar title="Courses" notificationCount={0} />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Course</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Course</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Course Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div>
                  <Label>Sector</Label>
                  <Select value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}>
                    <option value="">Select sector...</option>
                    <option value="Health & Social Care">Health & Social Care</option>
                    <option value="Technology">Technology</option>
                    <option value="Education">Education</option>
                    <option value="Finance">Finance</option>
                    <option value="Construction">Construction</option>
                    <option value="Marketing & Sales">Marketing & Sales</option>
                    <option value="Logistics">Logistics</option>
                    <option value="General">General</option>
                  </Select>
                </div>
                <div><Label>Duration</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 12 weeks" /></div>
                <div>
                  <Label>Required Skills</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const s = skillInput.trim(); if (s) { setSkills([...skills, s]); setSkillInput("") } } }} placeholder="Add skill..." />
                    <Button variant="outline" onClick={() => { const s = skillInput.trim(); if (s) { setSkills([...skills, s]); setSkillInput("") } }} type="button"><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {skills.map((s) => <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => setSkills(skills.filter((x) => x !== s))}>{s} x</Badge>)}
                  </div>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <Button onClick={createCourse} disabled={!form.name || !form.sector} className="w-full">Create Course</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <DataTable columns={columns} data={courses} searchPlaceholder="Search courses..." exportFilename="courses" />
      </div>
    </>
  )
}
