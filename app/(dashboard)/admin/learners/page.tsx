"use client"

import { useEffect, useState, useRef } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { StatCard } from "@/components/dashboard/StatCard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { CheckCircle2, Clock, UserX, Bell, Plus, Upload, FileText, Download, BookOpen, Send } from "lucide-react"

interface Learner {
  id: string
  user: { name: string; email: string; lastLoginAt: string | null }
  provider: { id: string; organisationName: string }
  profileComplete: number
  courseName: string | null
  [key: string]: unknown
}

interface Provider { id: string; organisationName: string }
interface Course { id: string; name: string; sector: string }
interface Sector { id: string; name: string }

interface BulkResult { learnerId?: string; name: string; email: string; password: string; status: "created" | "skipped"; reason?: string }
interface CVBulkResult {
  fileName: string; learnerId?: string; status: "created" | "failed"
  name: string; email: string; password: string
  skills: string[]; experienceCount: number; educationCount: number; certificateCount: number
  error?: string
}

export default function AdminLearnersPage() {
  const [learners, setLearners] = useState<Learner[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [nudging, setNudging] = useState<string | null>(null)
  const [nudgingAll, setNudgingAll] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sendingCreds, setSendingCreds] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ providerId: "", name: "", email: "", courseName: "", courseSector: "" })
  const [newCredential, setNewCredential] = useState<{ learnerId: string; email: string } | null>(null)

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkProviderId, setBulkProviderId] = useState("")
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkError, setBulkError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cvBulkDialogOpen, setCvBulkDialogOpen] = useState(false)
  const [cvBulkForm, setCvBulkForm] = useState({ providerId: "", courseName: "", courseSector: "" })
  const [cvBulkResults, setCvBulkResults] = useState<CVBulkResult[] | null>(null)
  const [cvBulkUploading, setCvBulkUploading] = useState(false)
  const [cvBulkError, setCvBulkError] = useState("")
  const cvFileInputRef = useRef<HTMLInputElement>(null)

  const [assignCourseOpen, setAssignCourseOpen] = useState(false)
  const [assignCourses, setAssignCourses] = useState<Course[]>([])
  const [assignCourseId, setAssignCourseId] = useState("")
  const [assigningCourse, setAssigningCourse] = useState(false)

  function refreshLearners() {
    fetch("/api/admin/learners").then((r) => r.json()).then((d) => { setLearners(d); setLoading(false) })
  }

  useEffect(() => {
    refreshLearners()
    fetch("/api/admin/providers").then((r) => (r.ok ? r.json() : [])).then(setProviders)
    fetch("/api/sectors").then((r) => (r.ok ? r.json() : [])).then(setSectors)
  }, [])

  async function nudgeLearner(learner: Learner) {
    setNudging(learner.id)
    await fetch("/api/admin/learners/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerIds: [learner.id] }),
    })
    setNudging(null)
  }

  async function nudgeAllNeverLoggedIn() {
    setNudgingAll(true)
    await fetch("/api/admin/learners/nudge", { method: "POST" })
    setNudgingAll(false)
  }

  async function createLearner() {
    const res = await fetch("/api/providers/learners", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const data = await res.json()
      setNewCredential({ learnerId: data.learner.id, email: data.user.email })
      setForm({ providerId: "", name: "", email: "", courseName: "", courseSector: "" })
      refreshLearners()
    }
  }

  async function sendCredentialsNow(learnerIds: string[]) {
    setSendingCreds(true)
    const res = await fetch("/api/providers/learners/send-credentials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerIds }),
    })
    setSendingCreds(false)
    if (res.ok) {
      const data = await res.json()
      alert(`Login details sent to ${data.sent} learner${data.sent !== 1 ? "s" : ""}${data.failed ? `, ${data.failed} failed` : ""}.`)
      refreshLearners()
    }
  }

  function assignCourseToBatch(learnerIds: string[]) {
    setSelectedIds(new Set(learnerIds))
    openAssignCourse(learnerIds)
  }

  function openAssignCourse(ids?: string[]) {
    const targetIds = ids || Array.from(selectedIds)
    const selected = learners.filter((l) => targetIds.includes(l.id))
    const providerIds = new Set(selected.map((l) => l.provider.id))
    if (providerIds.size > 1) {
      alert("Selected learners belong to different providers. Select learners from a single provider to assign a course.")
      return
    }
    const providerId = selected[0]?.provider.id
    if (!providerId) return
    fetch(`/api/providers/courses?providerId=${providerId}`).then((r) => (r.ok ? r.json() : [])).then(setAssignCourses)
    setAssignCourseOpen(true)
  }

  async function assignCourse() {
    if (!assignCourseId) return
    setAssigningCourse(true)
    const res = await fetch("/api/providers/learners/bulk-assign-course", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerIds: Array.from(selectedIds), courseId: assignCourseId }),
    })
    setAssigningCourse(false)
    if (res.ok) {
      const data = await res.json()
      setAssignCourseOpen(false)
      setAssignCourseId("")
      refreshLearners()
      const ids = Array.from(selectedIds)
      setSelectedIds(new Set())
      if (confirm(`Course assigned to ${data.updated} learner(s). Send login details to them now?`)) {
        await sendCredentialsNow(ids)
      }
    }
  }

  function handleBulkFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!bulkProviderId) { setBulkError("Select a provider first"); return }
    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      const lines = text.trim().split("\n")
      if (lines.length < 2) {
        setBulkError("CSV must have a header row and at least one data row")
        return
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""))
      const nameIdx = headers.findIndex((h) => h === "name" || h === "full name" || h === "fullname")
      const emailIdx = headers.findIndex((h) => h === "email" || h === "email address")
      const courseIdx = headers.findIndex((h) => h === "course" || h === "coursename" || h === "course_name" || h === "course name")
      const sectorIdx = headers.findIndex((h) => h === "sector" || h === "coursesector" || h === "course_sector" || h === "course sector")

      if (nameIdx === -1 || emailIdx === -1) {
        setBulkError("CSV must have 'name' and 'email' columns")
        return
      }

      const learnerData = lines.slice(1).filter((l) => l.trim()).map((line) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
        return {
          name: cols[nameIdx] || "",
          email: cols[emailIdx] || "",
          courseName: courseIdx >= 0 ? cols[courseIdx] || "" : "",
          courseSector: sectorIdx >= 0 ? cols[sectorIdx] || "" : "",
        }
      }).filter((l) => l.name && l.email)

      if (learnerData.length === 0) {
        setBulkError("No valid learner rows found in CSV")
        return
      }

      setBulkUploading(true)
      setBulkError("")
      const res = await fetch("/api/providers/learners/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learners: learnerData, providerId: bulkProviderId }),
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
    const created = bulkResults.filter((r) => r.status === "created")
    const csv = [
      "name,email,password,login_url",
      ...created.map((r) => `"${r.name}","${r.email}","${r.password}","${window.location.origin}/login"`),
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
    if (!cvBulkForm.providerId) { setCvBulkError("Select a provider first"); return }

    setCvBulkUploading(true)
    setCvBulkError("")

    const formData = new FormData()
    for (let i = 0; i < files.length; i++) formData.append("cvs", files[i])
    formData.append("providerId", cvBulkForm.providerId)
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
    const created = cvBulkResults.filter((r) => r.status === "created")
    const csv = [
      "name,email,password,skills,experiences,education,certificates,login_url",
      ...created.map((r) => `"${r.name}","${r.email}","${r.password}","${r.skills.join("; ")}",${r.experienceCount},${r.educationCount},${r.certificateCount},"${window.location.origin}/login"`),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cv-bulk-learner-credentials.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const completedCount = learners.filter((l) => l.user.lastLoginAt && l.profileComplete >= 100).length
  const incompleteCount = learners.filter((l) => l.user.lastLoginAt && l.profileComplete < 100).length
  const neverLoggedInCount = learners.filter((l) => !l.user.lastLoginAt).length

  const columns: Column<Learner>[] = [
    { key: "name", label: "Name", render: (row) => row.user?.name || "—" },
    { key: "email", label: "Email", render: (row) => row.user?.email || "—" },
    { key: "provider", label: "Provider", render: (row) => row.provider?.organisationName || "—" },
    { key: "courseName", label: "Course" },
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
  ]

  if (loading) return <><TopBar title="Learners" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Learners" />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Completed Profile" value={completedCount} icon={<CheckCircle2 className="h-6 w-6" />} description="Logged in & 100% complete" color="bg-green-100 text-green-700" />
          <StatCard title="Incomplete Profile" value={incompleteCount} icon={<Clock className="h-6 w-6" />} description="Logged in, profile incomplete" color="bg-amber-100 text-amber-700" />
          <StatCard title="Never Logged In" value={neverLoggedInCount} icon={<UserX className="h-6 w-6" />} description="Haven't logged in yet" color="bg-gray-100 text-gray-700" />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between bg-[#5B4FE8]/5 border border-[#5B4FE8]/20 rounded-md p-3">
            <span className="text-sm font-medium text-[#5B4FE8]">{selectedIds.size} learner{selectedIds.size !== 1 ? "s" : ""} selected</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openAssignCourse()}>
                <BookOpen className="h-4 w-4 mr-2" />Assign Course
              </Button>
              <Button size="sm" variant="outline" onClick={() => sendCredentialsNow(Array.from(selectedIds))} disabled={sendingCreds}>
                <Send className="h-4 w-4 mr-2" />{sendingCreds ? "Sending..." : "Send Login Details"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {neverLoggedInCount > 0 && (
            <Button variant="outline" onClick={nudgeAllNeverLoggedIn} disabled={nudgingAll}>
              <Bell className="h-4 w-4 mr-2" />{nudgingAll ? "Sending..." : `Nudge All (${neverLoggedInCount})`}
            </Button>
          )}

          <Dialog open={cvBulkDialogOpen} onOpenChange={(open) => { setCvBulkDialogOpen(open); if (!open) { setCvBulkResults(null); setCvBulkError(""); setCvBulkForm({ providerId: "", courseName: "", courseSector: "" }) } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-[#5B4FE8]/5 border-[#5B4FE8]/20 text-[#5B4FE8] hover:bg-[#5B4FE8]/10"><FileText className="h-4 w-4 mr-2" />Bulk CV Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{cvBulkResults ? "CV Upload Results" : "Bulk CV Upload"}</DialogTitle></DialogHeader>
              {cvBulkResults ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm font-medium text-green-800">
                      {cvBulkResults.filter((r) => r.status === "created").length} learners created, {cvBulkResults.filter((r) => r.status === "failed").length} failed
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {cvBulkResults.map((r, i) => (
                      <div key={i} className={`text-sm p-2 rounded ${r.status === "created" ? "bg-green-50" : "bg-red-50"}`}>
                        <div className="flex justify-between">
                          <span className="font-medium">{r.name || r.fileName}</span>
                          {r.status === "created" ? <span className="text-green-600 text-xs">Created</span> : <span className="text-red-600 text-xs">{r.error}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {cvBulkResults.some((r) => r.status === "created") && (
                    <>
                      <Button variant="outline" onClick={downloadCvBulkCredentials} className="w-full">
                        <Download className="h-4 w-4 mr-2" />Download Credentials CSV
                      </Button>
                      <p className="text-sm text-gray-600">Send their login details now, or assign a course first?</p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => { assignCourseToBatch(cvBulkResults.filter((r) => r.status === "created" && r.learnerId).map((r) => r.learnerId!)); setCvBulkDialogOpen(false); setCvBulkResults(null) }}>
                          Assign course first
                        </Button>
                        <Button className="flex-1" disabled={sendingCreds} onClick={async () => { await sendCredentialsNow(cvBulkResults.filter((r) => r.status === "created" && r.learnerId).map((r) => r.learnerId!)); setCvBulkDialogOpen(false); setCvBulkResults(null) }}>
                          {sendingCreds ? "Sending..." : "Send login details"}
                        </Button>
                      </div>
                    </>
                  )}
                  <Button variant="outline" onClick={() => { setCvBulkDialogOpen(false); setCvBulkResults(null) }} className="w-full">Close</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cvBulkError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{cvBulkError}</div>}
                  <div>
                    <Label>Provider</Label>
                    <Select value={cvBulkForm.providerId} onChange={(e) => setCvBulkForm({ ...cvBulkForm, providerId: e.target.value })}>
                      <option value="">Select provider...</option>
                      {providers.map((p) => <option key={p.id} value={p.id}>{p.organisationName}</option>)}
                    </Select>
                  </div>
                  <div className="border-2 border-dashed border-[#5B4FE8]/20 rounded-lg p-6 text-center bg-[#5B4FE8]/5">
                    <FileText className="h-8 w-8 mx-auto text-[#5B4FE8] mb-2" />
                    <p className="text-sm text-gray-700 font-medium mb-1">Upload CV files (PDF or DOCX)</p>
                    <p className="text-xs text-gray-500 mb-4">Extracts names, emails, phone, skills, experience, education, and certificates from each CV.</p>
                    <input ref={cvFileInputRef} type="file" accept=".pdf,.doc,.docx" multiple onChange={handleCvBulkUpload} className="hidden" />
                    <Button onClick={() => cvFileInputRef.current?.click()} disabled={cvBulkUploading || !cvBulkForm.providerId} className="bg-[#5B4FE8] hover:bg-[#4A3FD8]">
                      {cvBulkUploading ? "Processing CVs..." : "Choose CV Files"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div><Label>Course Name (optional)</Label><Input value={cvBulkForm.courseName} onChange={(e) => setCvBulkForm({ ...cvBulkForm, courseName: e.target.value })} placeholder="e.g. Web Development" /></div>
                    <div><Label>Course Sector (optional)</Label><Select value={cvBulkForm.courseSector} onChange={(e) => setCvBulkForm({ ...cvBulkForm, courseSector: e.target.value })}><option value="">Select sector...</option>{sectors.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</Select></div>
                  </div>
                  <p className="text-xs text-gray-500">Max 50 CVs per batch. Passwords auto-generated.</p>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={bulkDialogOpen} onOpenChange={(open) => { setBulkDialogOpen(open); if (!open) { setBulkResults(null); setBulkError(""); setBulkProviderId("") } }}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="h-4 w-4 mr-2" />CSV Upload</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{bulkResults ? "Bulk Upload Results" : "Bulk Upload Learners"}</DialogTitle></DialogHeader>
              {bulkResults ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm font-medium text-green-800">
                      {bulkResults.filter((r) => r.status === "created").length} created, {bulkResults.filter((r) => r.status === "skipped").length} skipped
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {bulkResults.map((r, i) => (
                      <div key={i} className={`text-sm p-2 rounded ${r.status === "created" ? "bg-green-50" : "bg-yellow-50"}`}>
                        <span className="font-medium">{r.name}</span> ({r.email})
                        {r.status === "created" ? <span className="text-green-600 ml-2">Created</span> : <span className="text-yellow-600 ml-2">— Skipped: {r.reason}</span>}
                      </div>
                    ))}
                  </div>
                  {bulkResults.some((r) => r.status === "created") && (
                    <>
                      <Button variant="outline" onClick={downloadBulkCredentials} className="w-full">
                        <Download className="h-4 w-4 mr-2" />Download Credentials CSV
                      </Button>
                      <p className="text-sm text-gray-600">Send their login details now, or assign a course first?</p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => { assignCourseToBatch(bulkResults.filter((r) => r.status === "created" && r.learnerId).map((r) => r.learnerId!)); setBulkDialogOpen(false); setBulkResults(null) }}>
                          Assign course first
                        </Button>
                        <Button className="flex-1" disabled={sendingCreds} onClick={async () => { await sendCredentialsNow(bulkResults.filter((r) => r.status === "created" && r.learnerId).map((r) => r.learnerId!)); setBulkDialogOpen(false); setBulkResults(null) }}>
                          {sendingCreds ? "Sending..." : "Send login details"}
                        </Button>
                      </div>
                    </>
                  )}
                  <Button variant="outline" onClick={() => { setBulkDialogOpen(false); setBulkResults(null) }} className="w-full">Close</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bulkError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{bulkError}</div>}
                  <div>
                    <Label>Provider</Label>
                    <Select value={bulkProviderId} onChange={(e) => setBulkProviderId(e.target.value)}>
                      <option value="">Select provider...</option>
                      {providers.map((p) => <option key={p.id} value={p.id}>{p.organisationName}</option>)}
                    </Select>
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload a CSV file with learner details</p>
                    <p className="text-xs text-gray-400 mb-4">Required columns: name, email. Optional: course, sector</p>
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleBulkFileSelect} className="hidden" />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={bulkUploading || !bulkProviderId}>
                      {bulkUploading ? "Uploading..." : "Choose CSV File"}
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-xs font-medium text-gray-600 mb-1">Example CSV format:</p>
                    <code className="text-xs text-gray-500 block">name,email,course,sector<br />John Smith,john@email.com,Web Dev,Technology</code>
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
                    <p className="text-sm font-medium text-green-800">Learner account created:</p>
                    <p className="text-sm mt-1"><strong>Email:</strong> {newCredential.email}</p>
                  </div>
                  <p className="text-sm text-gray-600">Send their login details now, or assign a course first?</p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { assignCourseToBatch([newCredential.learnerId]); setDialogOpen(false); setNewCredential(null) }}>
                      Assign course first
                    </Button>
                    <Button className="flex-1" disabled={sendingCreds} onClick={async () => { await sendCredentialsNow([newCredential.learnerId]); setDialogOpen(false); setNewCredential(null) }}>
                      {sendingCreds ? "Sending..." : "Send login details"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Provider</Label>
                    <Select value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })}>
                      <option value="">Select provider...</option>
                      {providers.map((p) => <option key={p.id} value={p.id}>{p.organisationName}</option>)}
                    </Select>
                  </div>
                  <div><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Course Name</Label><Input value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} /></div>
                  <div>
                    <Label>Course Sector</Label>
                    <Select value={form.courseSector} onChange={(e) => setForm({ ...form, courseSector: e.target.value })}>
                      <option value="">Select sector...</option>
                      {sectors.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </Select>
                  </div>
                  <Button onClick={createLearner} disabled={!form.providerId || !form.name || !form.email} className="w-full">Create Learner</Button>
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

      {/* Assign Course Dialog */}
      <Dialog open={assignCourseOpen} onOpenChange={(open) => { setAssignCourseOpen(open); if (!open) setAssignCourseId("") }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Course to {selectedIds.size} Learner{selectedIds.size !== 1 ? "s" : ""}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Course</Label>
              <Select value={assignCourseId} onChange={(e) => setAssignCourseId(e.target.value)}>
                <option value="">Select course...</option>
                {assignCourses.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.sector})</option>)}
              </Select>
            </div>
            <Button onClick={assignCourse} disabled={!assignCourseId || assigningCourse} className="w-full">
              {assigningCourse ? "Assigning..." : "Assign Course"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
