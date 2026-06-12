"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Download, Award } from "lucide-react"

interface Learner {
  id: string
  userId: string
  user: { name: string; email: string }
  cohort: { name: string } | null
  ragStatus: string
  profileComplete: number
  ms1Achieved: boolean
  ms2Achieved: boolean
  ms3Achieved: boolean
  courseName: string | null
  [key: string]: unknown
}

interface Cohort { id: string; name: string }

export default function ProviderLearnersPage() {
  const [learners, setLearners] = useState<Learner[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", cohortId: "", courseName: "", courseSector: "" })
  const [newCredential, setNewCredential] = useState<{ email: string; password: string } | null>(null)

  useEffect(() => {
    fetch("/api/providers/learners").then((r) => r.json()).then(setLearners)
    fetch("/api/providers/cohorts").then((r) => r.json()).then(setCohorts)
  }, [])

  async function createLearner() {
    const res = await fetch("/api/providers/learners", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const data = await res.json()
      setNewCredential({ email: data.user.email, password: data.generatedPassword })
      setForm({ name: "", email: "", cohortId: "", courseName: "", courseSector: "" })
      fetch("/api/providers/learners").then((r) => r.json()).then(setLearners)
    }
  }

  function downloadCredentials() {
    window.open("/api/providers/learners/credentials", "_blank")
  }

  const ragColors: Record<string, string> = { GREEN: "bg-green-100 text-green-700", AMBER: "bg-amber-100 text-amber-700", RED: "bg-red-100 text-red-700" }

  const columns: Column<Learner>[] = [
    { key: "name", label: "Name", render: (row) => row.user?.name || "—" },
    { key: "email", label: "Email", render: (row) => row.user?.email || "—" },
    { key: "courseName", label: "Course" },
    { key: "cohort", label: "Cohort", render: (row) => row.cohort?.name || "—" },
    { key: "ragStatus", label: "RAG", render: (row) => <Badge className={ragColors[row.ragStatus] || ""}>{row.ragStatus}</Badge> },
    { key: "profileComplete", label: "Profile %", render: (row) => `${row.profileComplete}%` },
    {
      key: "milestones", label: "Milestones", sortable: false,
      render: (row) => (
        <div className="flex gap-1">
          {[row.ms1Achieved, row.ms2Achieved, row.ms3Achieved].map((achieved, i) => (
            <div key={i} className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${achieved ? "bg-primary text-white" : "bg-gray-100 text-gray-400"}`}>
              {achieved ? <Award className="h-3 w-3" /> : `M${i + 1}`}
            </div>
          ))}
        </div>
      ),
    },
  ]

  return (
    <>
      <TopBar title="Learners" notificationCount={0} />
      <div className="p-6 space-y-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={downloadCredentials}>
            <Download className="h-4 w-4 mr-2" />Download Credentials
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setNewCredential(null) }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Learner</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{newCredential ? "Learner Created" : "New Learner"}</DialogTitle></DialogHeader>
              {newCredential ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm font-medium text-green-800">Login credentials generated:</p>
                    <p className="text-sm mt-1"><strong>Email:</strong> {newCredential.email}</p>
                    <p className="text-sm"><strong>Password:</strong> {newCredential.password}</p>
                  </div>
                  <p className="text-xs text-gray-500">Save these credentials — the password cannot be retrieved later.</p>
                  <Button onClick={() => { setDialogOpen(false); setNewCredential(null) }} className="w-full">Done</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Cohort</Label><Select value={form.cohortId} onChange={(e) => setForm({ ...form, cohortId: e.target.value })}><option value="">Select cohort...</option>{cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
                  <div><Label>Course Name</Label><Input value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} /></div>
                  <div>
                    <Label>Course Sector</Label>
                    <Select value={form.courseSector} onChange={(e) => setForm({ ...form, courseSector: e.target.value })}>
                      <option value="">Select sector...</option>
                      <option value="Health & Social Care">Health & Social Care</option>
                      <option value="Technology">Technology</option>
                      <option value="Education">Education</option>
                      <option value="Finance">Finance</option>
                      <option value="Construction">Construction</option>
                    </Select>
                  </div>
                  <Button onClick={createLearner} disabled={!form.name || !form.email} className="w-full">Create Learner</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
        <DataTable columns={columns} data={learners} searchPlaceholder="Search learners..." exportFilename="learners" />
      </div>
    </>
  )
}
