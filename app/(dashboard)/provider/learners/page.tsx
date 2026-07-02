"use client"

import { useState, useEffect, useRef } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/dashboard/StatCard"
import { Plus, Download, Award, Upload, FileText, Pencil, Trash2, AlertTriangle, CheckCircle2, Clock, UserX, Bell, Send } from "lucide-react"

interface Learner {
  id: string
  userId: string
  user: { name: string; email: string; lastLoginAt: string | null }
  cohort: { name: string } | null
  cohortId: string | null
  ragStatus: string
  profileComplete: number
  ms1Achieved: boolean
  ms2Achieved: boolean
  ms3Achieved: boolean
  courseName: string | null
  courseSector: string | null
  [key: string]: unknown
}

interface Cohort { id: string; name: string }

interface BulkResult {
  name: string
  email: string
  password: string
  status: "created" | "skipped"
  reason?: string
}

interface CVBulkResult {
  fileName: string
  status: "created" | "failed"
  name: string
  email: string
  password: string
  skills: string[]
  experienceCount: number
  educationCount: number
  certificateCount: number
  error?: string
}

export default function ProviderLearnersPage() {
  const [learners, setLearners] = useState<Learner[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", cohortId: "", courseName: "", courseSector: "" })
  const [newCredential, setNewCredential] = useState<{ email: string; password: string } | null>(null)
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkError, setBulkError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cvBulkDialogOpen, setCvBulkDialogOpen] = useState(false)
  const [cvBulkResults, setCvBulkResults] = useState<CVBulkResult[] | null>(null)
  const [cvBulkUploading, setCvBulkUploading] = useState(false)
  const [cvBulkError, setCvBulkError] = useState("")
  const [cvBulkForm, setCvBulkForm] = useState({ cohortId: "", courseName: "", courseSector: "" })
  const cvFileInputRef = useRef<HTMLInputElement>(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", newPassword: "", cohortId: "", courseName: "", courseSector: "", ragStatus: "GREEN" })
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null)
  const [editError, setEditError] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingLearner, setDeletingLearner] = useState<Learner | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [nudging, setNudging] = useState<string | null>(null)
  const [nudgingAll, setNudgingAll] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false)
  const [notifyForm, setNotifyForm] = useState({ title: "", body: "", link: "", sendEmail: false })
  const [notifySending, setNotifySending] = useState(false)
  const [notifyResult, setNotifyResult] = useState<{ notified: number; emailsSent: number; emailsFailed: number } | null>(null)

  function refreshLearners() {
    fetch("/api/providers/learners").then((r) => r.json()).then(setLearners)
  }

  useEffect(() => {
    refreshLearners()
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
      refreshLearners()
    }
  }

  function downloadCredentials() {
    window.open("/api/providers/learners/credentials", "_blank")
  }

  function openEditDialog(learner: Learner) {
    setEditingLearner(learner)
    setEditForm({
      name: learner.user.name || "",
      email: learner.user.email || "",
      newPassword: "",
      cohortId: learner.cohortId || "",
      courseName: learner.courseName || "",
      courseSector: learner.courseSector || "",
      ragStatus: learner.ragStatus || "GREEN",
    })
    setEditError("")
    setEditDialogOpen(true)
  }

  async function saveEdit() {
    if (!editingLearner) return
    setEditSaving(true)
    setEditError("")
    const res = await fetch(`/api/providers/learners/${editingLearner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setEditSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setEditError(data.error || "Failed to update learner")
      return
    }
    setEditDialogOpen(false)
    refreshLearners()
  }

  function openDeleteDialog(learner: Learner) {
    setDeletingLearner(learner)
    setDeleteConfirm("")
    setDeleteDialogOpen(true)
  }

  async function confirmDelete() {
    if (!deletingLearner) return
    setDeleting(true)
    await fetch(`/api/providers/learners/${deletingLearner.id}`, { method: "DELETE" })
    setDeleting(false)
    setDeleteDialogOpen(false)
    refreshLearners()
  }

  async function toggleMilestone(learner: Learner, milestone: "ms1Achieved" | "ms2Achieved" | "ms3Achieved") {
    const newValue = !learner[milestone]
    setLearners(prev => prev.map(l => l.id === learner.id ? { ...l, [milestone]: newValue } : l))
    await fetch(`/api/providers/learners/${learner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [milestone]: newValue }),
    })
  }

  function handleBulkFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.trim().split("\n")
      if (lines.length < 2) {
        setBulkError("CSV must have a header row and at least one data row")
        return
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""))
      const nameIdx = headers.findIndex(h => h === "name" || h === "full name" || h === "fullname")
      const emailIdx = headers.findIndex(h => h === "email" || h === "email address")
      const cohortIdx = headers.findIndex(h => h === "cohort" || h === "cohortid" || h === "cohort_id")
      const courseIdx = headers.findIndex(h => h === "course" || h === "coursename" || h === "course_name" || h === "course name")
      const sectorIdx = headers.findIndex(h => h === "sector" || h === "coursesector" || h === "course_sector" || h === "course sector")

      if (nameIdx === -1 || emailIdx === -1) {
        setBulkError("CSV must have 'name' and 'email' columns")
        return
      }

      const cohortMap = new Map(cohorts.map(c => [c.name.toLowerCase(), c.id]))

      const learnerData = lines.slice(1).filter(l => l.trim()).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
        const cohortVal = cohortIdx >= 0 ? cols[cohortIdx] : ""
        const cohortId = cohortMap.get(cohortVal?.toLowerCase()) || ""
        return {
          name: cols[nameIdx] || "",
          email: cols[emailIdx] || "",
          cohortId,
          courseName: courseIdx >= 0 ? cols[courseIdx] || "" : "",
          courseSector: sectorIdx >= 0 ? cols[sectorIdx] || "" : "",
        }
      }).filter(l => l.name && l.email)

      if (learnerData.length === 0) {
        setBulkError("No valid learner rows found in CSV")
        return
      }

      setBulkUploading(true)
      setBulkError("")
      const res = await fetch("/api/providers/learners/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learners: learnerData }),
      })
      const data = await res.json()
      setBulkUploading(false)

      if (!res.ok) {
        setBulkError(data.error || "Bulk upload failed")
        return
      }

      setBulkResults(data.results)
      refreshLearners()
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function downloadBulkCredentials() {
    if (!bulkResults) return
    const created = bulkResults.filter(r => r.status === "created")
    const csv = [
      "name,email,password,login_url",
      ...created.map(r => `"${r.name}","${r.email}","${r.password}","${window.location.origin}/login"`)
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bulk-learner-credentials.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleCvBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setCvBulkUploading(true)
    setCvBulkError("")

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) {
      formData.append("cvs", files[i])
    }
    if (cvBulkForm.cohortId) formData.append("cohortId", cvBulkForm.cohortId)
    if (cvBulkForm.courseName) formData.append("courseName", cvBulkForm.courseName)
    if (cvBulkForm.courseSector) formData.append("courseSector", cvBulkForm.courseSector)

    const res = await fetch("/api/upload/cv-bulk", { method: "POST", body: formData })
    const data = await res.json()
    setCvBulkUploading(false)

    if (!res.ok) {
      setCvBulkError(data.error || "Bulk CV upload failed")
      return
    }

    setCvBulkResults(data.results)
    refreshLearners()
    if (cvFileInputRef.current) cvFileInputRef.current.value = ""
  }

  function downloadCvBulkCredentials() {
    if (!cvBulkResults) return
    const created = cvBulkResults.filter(r => r.status === "created")
    const csv = [
      "name,email,password,skills,experiences,education,certificates,login_url",
      ...created.map(r => `"${r.name}","${r.email}","${r.password}","${r.skills.join("; ")}",${r.experienceCount},${r.educationCount},${r.certificateCount},"${window.location.origin}/login"`)
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cv-bulk-learner-credentials.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function nudgeLearner(learner: Learner) {
    setNudging(learner.id)
    await fetch("/api/providers/learners/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerIds: [learner.id] }),
    })
    setNudging(null)
  }

  async function nudgeAllNeverLoggedIn() {
    setNudgingAll(true)
    await fetch("/api/providers/learners/nudge", { method: "POST" })
    setNudgingAll(false)
  }

  async function sendBulkNotification() {
    setNotifySending(true)
    const res = await fetch("/api/providers/learners/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        learnerIds: Array.from(selectedIds),
        title: notifyForm.title,
        body: notifyForm.body,
        link: notifyForm.link || undefined,
        sendEmail: notifyForm.sendEmail,
      }),
    })
    setNotifySending(false)
    if (res.ok) {
      const data = await res.json()
      setNotifyResult(data)
      setSelectedIds(new Set())
    }
  }

  const completedCount = learners.filter((l) => l.user.lastLoginAt && l.profileComplete >= 100).length
  const incompleteCount = learners.filter((l) => l.user.lastLoginAt && l.profileComplete < 100).length
  const neverLoggedInCount = learners.filter((l) => !l.user.lastLoginAt).length

  const ragColors: Record<string, string> = { GREEN: "bg-green-100 text-green-700", AMBER: "bg-amber-100 text-amber-700", RED: "bg-red-100 text-red-700" }

  const columns: Column<Learner>[] = [
    { key: "name", label: "Name", render: (row) => row.user?.name || "—" },
    { key: "email", label: "Email", render: (row) => row.user?.email || "—" },
    { key: "courseName", label: "Course" },
    { key: "cohort", label: "Cohort", render: (row) => row.cohort?.name || "—" },
    { key: "ragStatus", label: "RAG", render: (row) => <Badge className={ragColors[row.ragStatus] || ""}>{row.ragStatus}</Badge> },
    { key: "profileComplete", label: "Profile %", render: (row) => `${row.profileComplete}%` },
    {
      key: "loginStatus", label: "Login Status",
      render: (row) => row.user.lastLoginAt
        ? <Badge className="bg-green-100 text-green-700">Logged in</Badge>
        : (
          <div className="flex items-center gap-1.5">
            <Badge className="bg-gray-100 text-gray-600">Never logged in</Badge>
            <button
              onClick={(e) => { e.stopPropagation(); nudgeLearner(row) }}
              disabled={nudging === row.id}
              title="Send reminder email"
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#5B4FE8] disabled:opacity-50"
            >
              <Bell className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
    },
    {
      key: "milestones", label: "Milestones", sortable: false,
      render: (row) => (
        <div className="flex gap-1">
          {(["ms1Achieved", "ms2Achieved", "ms3Achieved"] as const).map((ms, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); toggleMilestone(row, ms) }}
              title={`${row[ms] ? "Unmark" : "Mark"} Milestone ${i + 1}`}
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs cursor-pointer transition-colors ${row[ms] ? "bg-primary text-white hover:bg-primary/80" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
            >
              {row[ms] ? <Award className="h-3 w-3" /> : `M${i + 1}`}
            </button>
          ))}
        </div>
      ),
    },
    {
      key: "actions", label: "Actions", sortable: false,
      render: (row) => (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEditDialog(row) }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#5B4FE8]" title="Edit learner">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); openDeleteDialog(row) }} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete learner">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <TopBar title="Learners" notificationCount={0} />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Completed Profile" value={completedCount} icon={<CheckCircle2 className="h-6 w-6" />} description="Logged in & 100% complete" color="bg-green-100 text-green-700" />
          <StatCard title="Incomplete Profile" value={incompleteCount} icon={<Clock className="h-6 w-6" />} description="Logged in, profile incomplete" color="bg-amber-100 text-amber-700" />
          <StatCard title="Never Logged In" value={neverLoggedInCount} icon={<UserX className="h-6 w-6" />} description="Haven't logged in yet" color="bg-gray-100 text-gray-700" />
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-[#5B4FE8]/5 border border-[#5B4FE8]/20 rounded-md p-3">
            <span className="text-sm font-medium text-[#5B4FE8]">{selectedIds.size} learner{selectedIds.size !== 1 ? "s" : ""} selected</span>
            <Button size="sm" onClick={() => { setNotifyForm({ title: "", body: "", link: "", sendEmail: false }); setNotifyResult(null); setNotifyDialogOpen(true) }}>
              <Send className="h-4 w-4 mr-2" />Notify Selected
            </Button>
          </div>
        )}
        <div className="flex justify-end gap-2">
          {neverLoggedInCount > 0 && (
            <Button variant="outline" onClick={nudgeAllNeverLoggedIn} disabled={nudgingAll}>
              <Bell className="h-4 w-4 mr-2" />{nudgingAll ? "Sending..." : `Nudge All (${neverLoggedInCount})`}
            </Button>
          )}
          <Button variant="outline" onClick={downloadCredentials}>
            <Download className="h-4 w-4 mr-2" />Download Credentials
          </Button>

          <Dialog open={cvBulkDialogOpen} onOpenChange={(open) => { setCvBulkDialogOpen(open); if (!open) { setCvBulkResults(null); setCvBulkError(""); setCvBulkForm({ cohortId: "", courseName: "", courseSector: "" }) } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-[#5B4FE8]/5 border-[#5B4FE8]/20 text-[#5B4FE8] hover:bg-[#5B4FE8]/10"><FileText className="h-4 w-4 mr-2" />Bulk CV Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{cvBulkResults ? "CV Upload Results" : "Bulk CV Upload"}</DialogTitle></DialogHeader>
              {cvBulkResults ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm font-medium text-green-800">
                      {cvBulkResults.filter(r => r.status === "created").length} learners created, {cvBulkResults.filter(r => r.status === "failed").length} failed
                    </p>
                    <p className="text-xs text-green-600 mt-1">Profiles auto-populated from CVs and matched to jobs</p>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {cvBulkResults.map((r, i) => (
                      <div key={i} className={`text-sm p-2 rounded ${r.status === "created" ? "bg-green-50" : "bg-red-50"}`}>
                        <div className="flex justify-between">
                          <span className="font-medium">{r.name || r.fileName}</span>
                          {r.status === "created" ? (
                            <span className="text-green-600 text-xs">Created</span>
                          ) : (
                            <span className="text-red-600 text-xs">{r.error}</span>
                          )}
                        </div>
                        {r.status === "created" && (
                          <div className="text-xs text-gray-500 mt-1">
                            {r.email} &middot; {r.skills.length} skills &middot; {r.experienceCount} exp &middot; {r.educationCount} edu &middot; {r.certificateCount} certs
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {cvBulkResults.some(r => r.status === "created") && (
                    <Button variant="outline" onClick={downloadCvBulkCredentials} className="w-full">
                      <Download className="h-4 w-4 mr-2" />Download Credentials CSV
                    </Button>
                  )}
                  <Button onClick={() => { setCvBulkDialogOpen(false); setCvBulkResults(null) }} className="w-full">Done</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cvBulkError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{cvBulkError}</div>}
                  <div className="border-2 border-dashed border-[#5B4FE8]/20 rounded-lg p-6 text-center bg-[#5B4FE8]/5">
                    <FileText className="h-8 w-8 mx-auto text-[#5B4FE8] mb-2" />
                    <p className="text-sm text-gray-700 font-medium mb-1">Upload CV files (PDF or DOCX)</p>
                    <p className="text-xs text-gray-500 mb-4">Our system will extract names, emails, phone, skills, experience, education, and certificates from each CV, create learner accounts, and auto-match them to jobs.</p>
                    <input ref={cvFileInputRef} type="file" accept=".pdf,.doc,.docx" multiple onChange={handleCvBulkUpload} className="hidden" />
                    <Button onClick={() => cvFileInputRef.current?.click()} disabled={cvBulkUploading} className="bg-[#5B4FE8] hover:bg-[#4A3FD8]">
                      {cvBulkUploading ? "Processing CVs..." : "Choose CV Files"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div><Label>Cohort (optional)</Label><Select value={cvBulkForm.cohortId} onChange={(e) => setCvBulkForm({ ...cvBulkForm, cohortId: e.target.value })}><option value="">Select cohort...</option>{cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
                    <div><Label>Course Name (optional)</Label><Input value={cvBulkForm.courseName} onChange={(e) => setCvBulkForm({ ...cvBulkForm, courseName: e.target.value })} placeholder="e.g. Web Development" /></div>
                    <div><Label>Course Sector (optional)</Label><Select value={cvBulkForm.courseSector} onChange={(e) => setCvBulkForm({ ...cvBulkForm, courseSector: e.target.value })}><option value="">Select sector...</option><option value="Health & Social Care">Health & Social Care</option><option value="Technology">Technology</option><option value="Education">Education</option><option value="Finance">Finance</option><option value="Construction">Construction</option></Select></div>
                  </div>
                  <p className="text-xs text-gray-500">Max 50 CVs per batch. Passwords auto-generated. Matching runs automatically.</p>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={bulkDialogOpen} onOpenChange={(open) => { setBulkDialogOpen(open); if (!open) { setBulkResults(null); setBulkError("") } }}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="h-4 w-4 mr-2" />CSV Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{bulkResults ? "Bulk Upload Results" : "Bulk Upload Learners"}</DialogTitle></DialogHeader>
              {bulkResults ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm font-medium text-green-800">
                      {bulkResults.filter(r => r.status === "created").length} created, {bulkResults.filter(r => r.status === "skipped").length} skipped
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {bulkResults.map((r, i) => (
                      <div key={i} className={`text-sm p-2 rounded ${r.status === "created" ? "bg-green-50" : "bg-yellow-50"}`}>
                        <span className="font-medium">{r.name}</span> ({r.email})
                        {r.status === "created" ? (
                          <span className="text-green-600 ml-2">— Password: {r.password}</span>
                        ) : (
                          <span className="text-yellow-600 ml-2">— Skipped: {r.reason}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {bulkResults.some(r => r.status === "created") && (
                    <Button variant="outline" onClick={downloadBulkCredentials} className="w-full">
                      <Download className="h-4 w-4 mr-2" />Download Credentials CSV
                    </Button>
                  )}
                  <Button onClick={() => { setBulkDialogOpen(false); setBulkResults(null) }} className="w-full">Done</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bulkError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{bulkError}</div>}
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload a CSV file with learner details</p>
                    <p className="text-xs text-gray-400 mb-4">Required columns: name, email. Optional: cohort, course, sector</p>
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleBulkFileSelect} className="hidden" />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={bulkUploading}>
                      {bulkUploading ? "Uploading..." : "Choose CSV File"}
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-xs font-medium text-gray-600 mb-1">Example CSV format:</p>
                    <code className="text-xs text-gray-500 block">name,email,course,sector<br/>John Smith,john@email.com,Web Dev,Technology<br/>Jane Doe,jane@email.com,Nursing,Health &amp; Social Care</code>
                  </div>
                  <p className="text-xs text-gray-500">Passwords are auto-generated for each learner. Max 200 per batch.</p>
                </div>
              )}
            </DialogContent>
          </Dialog>

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
        <DataTable
          columns={columns}
          data={learners}
          searchPlaceholder="Search learners..."
          exportFilename="learners"
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      </div>

      {/* Edit Learner Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Learner</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{editError}</div>}
            <div><Label>Full Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div>
              <Label>New Password <span className="text-xs text-gray-400">(leave blank to keep current)</span></Label>
              <Input type="password" value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} placeholder="Min. 6 characters" />
            </div>
            <div><Label>Cohort</Label><Select value={editForm.cohortId} onChange={(e) => setEditForm({ ...editForm, cohortId: e.target.value })}><option value="">No cohort</option>{cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
            <div><Label>Course Name</Label><Input value={editForm.courseName} onChange={(e) => setEditForm({ ...editForm, courseName: e.target.value })} /></div>
            <div>
              <Label>Course Sector</Label>
              <Select value={editForm.courseSector} onChange={(e) => setEditForm({ ...editForm, courseSector: e.target.value })}>
                <option value="">Select sector...</option>
                <option value="Health & Social Care">Health & Social Care</option>
                <option value="Technology">Technology</option>
                <option value="Education">Education</option>
                <option value="Finance">Finance</option>
                <option value="Construction">Construction</option>
              </Select>
            </div>
            <div>
              <Label>RAG Status</Label>
              <Select value={editForm.ragStatus} onChange={(e) => setEditForm({ ...editForm, ragStatus: e.target.value })}>
                <option value="GREEN">GREEN</option>
                <option value="AMBER">AMBER</option>
                <option value="RED">RED</option>
              </Select>
            </div>
            <Button onClick={saveEdit} disabled={editSaving || !editForm.name || !editForm.email} className="w-full">
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Learner Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" />Delete Learner</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                This will permanently delete <strong>{deletingLearner?.user?.name}</strong> and all their data including applications, messages, matches, and their login account.
              </p>
            </div>
            <div>
              <Label>Type <strong>DELETE</strong> to confirm</Label>
              <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={confirmDelete} disabled={deleteConfirm !== "DELETE" || deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {deleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Notify Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Notify {selectedIds.size} Learner{selectedIds.size !== 1 ? "s" : ""}</DialogTitle></DialogHeader>
          {notifyResult ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
                Notified {notifyResult.notified} learner{notifyResult.notified !== 1 ? "s" : ""}.
                {notifyForm.sendEmail && ` ${notifyResult.emailsSent} email(s) sent${notifyResult.emailsFailed ? `, ${notifyResult.emailsFailed} failed` : ""}.`}
              </div>
              <Button onClick={() => setNotifyDialogOpen(false)} className="w-full">Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={notifyForm.title} onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} placeholder="e.g. New course materials available" />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea value={notifyForm.body} onChange={(e) => setNotifyForm({ ...notifyForm, body: e.target.value })} placeholder="Write your message..." />
              </div>
              <div>
                <Label>Link (optional)</Label>
                <Input value={notifyForm.link} onChange={(e) => setNotifyForm({ ...notifyForm, link: e.target.value })} placeholder="https://..." />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={notifyForm.sendEmail} onChange={(e) => setNotifyForm({ ...notifyForm, sendEmail: e.target.checked })} />
                Also send as email
              </label>
              <Button onClick={sendBulkNotification} disabled={notifySending || !notifyForm.title || !notifyForm.body} className="w-full">
                {notifySending ? "Sending..." : "Send Notification"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
