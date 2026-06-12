"use client"

import { useState, useEffect, useCallback } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { ProfileProgress } from "@/components/shared/ProfileProgress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { CVUpload } from "@/components/candidates/CVUpload"
import { Save, Plus, Trash2, X, Award } from "lucide-react"
import type { ParsedCV } from "@/lib/cv-parser"

interface Experience { id?: string; title: string; company: string; location?: string; startDate?: string; endDate?: string; current: boolean; description?: string }
interface Education { id?: string; institution: string; degree?: string; field?: string; startDate?: string; endDate?: string; current: boolean }
interface Certificate { id?: string; name: string; issuer?: string; issueDate?: string; fileUrl?: string }

export default function LearnerProfilePage() {
  const [activeTab, setActiveTab] = useState("personal")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [completion, setCompletion] = useState({ percentage: 0, incomplete: [] as string[] })
  const [courseInfo, setCourseInfo] = useState({ courseName: "", courseSector: "", ragStatus: "GREEN", ms1Achieved: false, ms2Achieved: false, ms3Achieved: false, providerName: "" })

  const [profile, setProfile] = useState({
    headline: "", bio: "", phone: "", location: "", photo: "",
    linkedIn: "", github: "", portfolio: "",
    desiredSalaryMin: "", desiredSalaryMax: "", desiredLocation: "", remotePreference: "",
    cvFile: "", cvText: "",
  })
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [desiredRoles, setDesiredRoles] = useState<string[]>([])
  const [roleInput, setRoleInput] = useState("")
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [educations, setEducations] = useState<Education[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/candidates/profile")
    if (res.ok) {
      const data = await res.json()
      setProfile({
        headline: data.headline || "", bio: data.bio || "",
        phone: data.phone || "", location: data.location || "",
        photo: data.photo || "", linkedIn: data.linkedIn || "",
        github: data.github || "", portfolio: data.portfolio || "",
        desiredSalaryMin: data.desiredSalaryMin?.toString() || "",
        desiredSalaryMax: data.desiredSalaryMax?.toString() || "",
        desiredLocation: data.desiredLocation || "",
        remotePreference: data.remotePreference || "",
        cvFile: data.cvFile || "", cvText: data.cvText || "",
      })
      setCourseInfo({
        courseName: data.courseName || "", courseSector: data.courseSector || "",
        ragStatus: data.ragStatus || "GREEN",
        ms1Achieved: data.ms1Achieved || false, ms2Achieved: data.ms2Achieved || false, ms3Achieved: data.ms3Achieved || false,
        providerName: data.provider?.organisationName || "",
      })
      try { setSkills(JSON.parse(data.skills || "[]")) } catch { setSkills([]) }
      try { setDesiredRoles(JSON.parse(data.desiredRoles || "[]")) } catch { setDesiredRoles([]) }
      setExperiences(data.experiences || [])
      setEducations(data.educations || [])
      setCertificates(data.certificates || [])
      setCompletion({ percentage: data.profileComplete || 0, incomplete: data.incomplete || [] })
    }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  async function saveProfile() {
    setSaving(true); setMessage("")
    const res = await fetch("/api/candidates/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...profile, skills, desiredRoles,
        desiredSalaryMin: profile.desiredSalaryMin ? parseInt(profile.desiredSalaryMin) : null,
        desiredSalaryMax: profile.desiredSalaryMax ? parseInt(profile.desiredSalaryMax) : null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setCompletion({ percentage: data.profileComplete, incomplete: data.incomplete || [] })
      setMessage("Profile saved successfully")
    } else { setMessage("Failed to save profile") }
    setSaving(false); setTimeout(() => setMessage(""), 3000)
  }

  async function addExperience(exp: Experience) {
    const res = await fetch("/api/candidates/experience", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(exp) })
    if (res.ok) setExperiences([...experiences, await res.json()])
  }
  async function deleteExperience(id: string) { await fetch(`/api/candidates/experience?id=${id}`, { method: "DELETE" }); setExperiences(experiences.filter((e) => e.id !== id)) }
  async function addEducation(edu: Education) {
    const res = await fetch("/api/candidates/education", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edu) })
    if (res.ok) setEducations([...educations, await res.json()])
  }
  async function deleteEducation(id: string) { await fetch(`/api/candidates/education?id=${id}`, { method: "DELETE" }); setEducations(educations.filter((e) => e.id !== id)) }
  async function addCertificate(cert: Certificate) {
    const res = await fetch("/api/candidates/certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cert) })
    if (res.ok) setCertificates([...certificates, await res.json()])
  }
  async function deleteCertificate(id: string) { await fetch(`/api/candidates/certificates?id=${id}`, { method: "DELETE" }); setCertificates(certificates.filter((c) => c.id !== id)) }

  function handleCVParsed(parsed: ParsedCV, fileName: string) {
    setProfile((p) => ({ ...p, cvFile: fileName, cvText: parsed.rawText.substring(0, 5000), phone: p.phone || parsed.phone, location: p.location || parsed.location }))
    if (parsed.skills.length > 0) setSkills((prev) => Array.from(new Set([...prev, ...parsed.skills])))
  }

  const ragColors: Record<string, string> = { GREEN: "bg-green-100 text-green-700", AMBER: "bg-amber-100 text-amber-700", RED: "bg-red-100 text-red-700" }

  return (
    <>
      <TopBar title="My Profile" notificationCount={0} />
      <div className="p-6 space-y-6 max-w-4xl">
        <ProfileProgress percentage={completion.percentage} incomplete={completion.incomplete}
          onSectionClick={(section) => {
            const tabMap: Record<string, string> = { "Personal Info": "personal", Skills: "skills", Experience: "experience", Education: "education", Preferences: "preferences", "CV Upload": "cv" }
            setActiveTab(tabMap[section] || "personal")
          }}
        />

        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-gray-500">Provider</p>
            <p className="font-medium">{courseInfo.providerName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Course</p>
            <p className="font-medium">{courseInfo.courseName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Sector</p>
            <p className="font-medium">{courseInfo.courseSector || "—"}</p>
          </div>
          <Badge className={ragColors[courseInfo.ragStatus] || ""}>RAG: {courseInfo.ragStatus}</Badge>
          <div className="flex items-center gap-2">
            {["MS1", "MS2", "MS3"].map((ms, i) => {
              const achieved = [courseInfo.ms1Achieved, courseInfo.ms2Achieved, courseInfo.ms3Achieved][i]
              return (
                <div key={ms} className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${achieved ? "bg-primary text-white" : "bg-gray-100 text-gray-400"}`}>
                  {achieved ? <Award className="h-4 w-4" /> : ms}
                </div>
              )
            })}
          </div>
        </div>

        {message && <div className={`p-3 rounded-md text-sm ${message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message}</div>}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex flex-wrap">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="cv">CV Upload</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Headline</Label><Input value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} placeholder="e.g. Care Assistant trainee" /></div>
                <div><Label>Phone</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} /></div>
                <div><Label>Photo URL</Label><Input value={profile.photo} onChange={(e) => setProfile({ ...profile, photo: e.target.value })} /></div>
              </div>
              <div><Label>Bio</Label><Textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} /></div>
              <Button onClick={saveProfile} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save"}</Button>
            </div>
          </TabsContent>

          <TabsContent value="skills">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Add a skill..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const s = skillInput.trim(); if (s && !skills.includes(s)) { setSkills([...skills, s]); setSkillInput("") } } }} />
                <Button variant="outline" onClick={() => { const s = skillInput.trim(); if (s && !skills.includes(s)) { setSkills([...skills, s]); setSkillInput("") } }}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {s}<button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <Button onClick={saveProfile} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Skills"}</Button>
            </div>
          </TabsContent>

          <TabsContent value="experience">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              {experiences.map((exp) => (
                <div key={exp.id} className="border border-gray-100 rounded-md p-4 flex justify-between">
                  <div><p className="font-medium">{exp.title}</p><p className="text-sm text-gray-500">{exp.company}</p></div>
                  <button type="button" onClick={() => exp.id && deleteExperience(exp.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <InlineForm fields={[{ name: "title", label: "Job Title" }, { name: "company", label: "Company" }]} required={["title", "company"]}
                onSubmit={(vals) => addExperience({ title: vals.title, company: vals.company, current: false })} buttonLabel="Add Experience" />
            </div>
          </TabsContent>

          <TabsContent value="education">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              {educations.map((edu) => (
                <div key={edu.id} className="border border-gray-100 rounded-md p-4 flex justify-between">
                  <div><p className="font-medium">{edu.degree || edu.institution}</p><p className="text-sm text-gray-500">{edu.institution}</p></div>
                  <button type="button" onClick={() => edu.id && deleteEducation(edu.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <InlineForm fields={[{ name: "institution", label: "Institution" }, { name: "degree", label: "Degree" }]} required={["institution"]}
                onSubmit={(vals) => addEducation({ institution: vals.institution, degree: vals.degree, current: false })} buttonLabel="Add Education" />
            </div>
          </TabsContent>

          <TabsContent value="certificates">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="border border-gray-100 rounded-md p-4 flex justify-between">
                  <div><p className="font-medium">{cert.name}</p><p className="text-sm text-gray-500">{cert.issuer}</p></div>
                  <button type="button" onClick={() => cert.id && deleteCertificate(cert.id)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <InlineForm fields={[{ name: "name", label: "Certificate Name" }, { name: "issuer", label: "Issuer" }]} required={["name"]}
                onSubmit={(vals) => addCertificate({ name: vals.name, issuer: vals.issuer })} buttonLabel="Add Certificate" />
            </div>
          </TabsContent>

          <TabsContent value="cv">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <CVUpload onParsed={handleCVParsed} onSave={(parsed, fileName) => { handleCVParsed(parsed, fileName); saveProfile() }} />
              {profile.cvFile && <p className="mt-3 text-sm text-gray-500">Current CV: {profile.cvFile}</p>}
            </div>
          </TabsContent>

          <TabsContent value="preferences">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Add desired role..." value={roleInput} onChange={(e) => setRoleInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const r = roleInput.trim(); if (r && !desiredRoles.includes(r)) { setDesiredRoles([...desiredRoles, r]); setRoleInput("") } } }} />
                <Button variant="outline" onClick={() => { const r = roleInput.trim(); if (r && !desiredRoles.includes(r)) { setDesiredRoles([...desiredRoles, r]); setRoleInput("") } }}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">{desiredRoles.map((r) => (<span key={r} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{r}<button type="button" onClick={() => setDesiredRoles(desiredRoles.filter((x) => x !== r))}><X className="h-3 w-3" /></button></span>))}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Min Salary</Label><Input type="number" value={profile.desiredSalaryMin} onChange={(e) => setProfile({ ...profile, desiredSalaryMin: e.target.value })} /></div>
                <div><Label>Max Salary</Label><Input type="number" value={profile.desiredSalaryMax} onChange={(e) => setProfile({ ...profile, desiredSalaryMax: e.target.value })} /></div>
                <div><Label>Preferred Location</Label><Input value={profile.desiredLocation} onChange={(e) => setProfile({ ...profile, desiredLocation: e.target.value })} /></div>
                <div><Label>Remote</Label><Select value={profile.remotePreference} onChange={(e) => setProfile({ ...profile, remotePreference: e.target.value })}><option value="">Select...</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ON_SITE">On-site</option><option value="FLEXIBLE">Flexible</option></Select></div>
              </div>
              <Button onClick={saveProfile} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Preferences"}</Button>
            </div>
          </TabsContent>

          <TabsContent value="social">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div><Label>LinkedIn</Label><Input value={profile.linkedIn} onChange={(e) => setProfile({ ...profile, linkedIn: e.target.value })} /></div>
              <div><Label>GitHub</Label><Input value={profile.github} onChange={(e) => setProfile({ ...profile, github: e.target.value })} /></div>
              <div><Label>Portfolio</Label><Input value={profile.portfolio} onChange={(e) => setProfile({ ...profile, portfolio: e.target.value })} /></div>
              <Button onClick={saveProfile} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Social Links"}</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function InlineForm({ fields, required, onSubmit, buttonLabel }: {
  fields: { name: string; label: string }[]; required: string[]
  onSubmit: (vals: Record<string, string>) => void; buttonLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [vals, setVals] = useState<Record<string, string>>({})
  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />{buttonLabel}</Button>
  const canSubmit = required.every((r) => vals[r]?.trim())
  return (
    <div className="border border-gray-200 rounded-md p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f) => (<div key={f.name}><Label>{f.label}</Label><Input value={vals[f.name] || ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} /></div>))}
      </div>
      <div className="flex gap-2">
        <Button onClick={() => { onSubmit(vals); setVals({}); setOpen(false) }} disabled={!canSubmit}>Add</Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}
