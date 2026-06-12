"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, ArrowLeft } from "lucide-react"

export default function PostJobPage() {
  const router = useRouter()
  const [form, setForm] = useState({ title: "", sector: "", location: "", salaryMin: "", salaryMax: "", jobType: "Full-time", description: "", deadline: "", isRemote: false })
  const [skillInput, setSkillInput] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    const res = await fetch("/api/jobs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, requiredSkills: skills, salaryMin: form.salaryMin ? parseInt(form.salaryMin) : null, salaryMax: form.salaryMax ? parseInt(form.salaryMax) : null }),
    })
    if (res.ok) router.push("/employer/jobs")
    setSubmitting(false)
  }

  return (
    <>
      <TopBar title="Post New Job" notificationCount={0} />
      <div className="p-6 max-w-2xl">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" />Back
        </button>
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div><Label>Job Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Developer" /></div>
          <div className="grid grid-cols-2 gap-4">
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
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. London" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Min Salary (£)</Label><Input type="number" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} /></div>
            <div><Label>Max Salary (£)</Label><Input type="number" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Job Type</Label>
              <Select value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value })}>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input type="checkbox" id="remote" checked={form.isRemote} onChange={(e) => setForm({ ...form, isRemote: e.target.checked })} className="h-4 w-4" />
              <Label htmlFor="remote">Remote position</Label>
            </div>
          </div>
          <div>
            <Label>Required Skills</Label>
            <div className="flex gap-2 mt-1">
              <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const s = skillInput.trim(); if (s) { setSkills([...skills, s]); setSkillInput("") } } }} placeholder="Add skill..." />
              <Button variant="outline" type="button" onClick={() => { const s = skillInput.trim(); if (s) { setSkills([...skills, s]); setSkillInput("") } }}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {skills.map((s) => <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => setSkills(skills.filter((x) => x !== s))}>{s} x</Badge>)}
            </div>
          </div>
          <div><Label>Application Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} placeholder="Job description, responsibilities, requirements..." /></div>
          <Button onClick={handleSubmit} disabled={submitting || !form.title || !form.sector} className="w-full">Publish Job</Button>
        </div>
      </div>
    </>
  )
}
