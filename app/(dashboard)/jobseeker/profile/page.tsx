"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { ProfileProgress } from "@/components/shared/ProfileProgress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { CVUpload } from "@/components/candidates/CVUpload"
import { Save, Plus, Trash2, X, Upload, Edit3 } from "lucide-react"
import type { ParsedCV } from "@/lib/cv-parser"

interface Experience {
  id?: string
  title: string
  company: string
  location?: string
  startDate?: string
  endDate?: string
  current: boolean
  description?: string
}

interface Education {
  id?: string
  institution: string
  degree?: string
  field?: string
  startDate?: string
  endDate?: string
  current: boolean
}

interface Certificate {
  id?: string
  name: string
  issuer?: string
  issueDate?: string
  fileUrl?: string
}

const SALARY_BANDS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Under £25,000", min: null, max: 25000 },
  { label: "£25,000 – £35,000", min: 25000, max: 35000 },
  { label: "£35,000 – £50,000", min: 35000, max: 50000 },
]

function bandFromSalary(min: number | null | undefined, max: number | null | undefined): string {
  const found = SALARY_BANDS.find((b) => b.min === (min ?? null) && b.max === (max ?? null))
  return found?.label || ""
}

export default function JobSeekerProfilePage() {
  useSession()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "personal")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [completion, setCompletion] = useState({ percentage: 0, incomplete: [] as string[] })

  const [profile, setProfile] = useState({
    headline: "", bio: "", phone: "", location: "", photo: "",
    linkedIn: "", github: "", portfolio: "",
    salaryBand: "", employmentType: "", desiredLocation: "", remotePreference: "",
    cvFile: "", cvText: "",
  })
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([])
  const [desiredSectors, setDesiredSectors] = useState<string[]>([])
  const [sectorLimitMsg, setSectorLimitMsg] = useState("")
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [educations, setEducations] = useState<Education[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])

  const loadProfile = useCallback(async () => {
    const [profileRes, sectorsRes] = await Promise.all([
      fetch("/api/candidates/profile"),
      fetch("/api/sectors"),
    ])
    if (sectorsRes.ok) setSectors(await sectorsRes.json())
    if (profileRes.ok) {
      const data = await profileRes.json()
      setProfile({
        headline: data.headline || "", bio: data.bio || "",
        phone: data.phone || "", location: data.location || "",
        photo: data.photo || "", linkedIn: data.linkedIn || "",
        github: data.github || "", portfolio: data.portfolio || "",
        salaryBand: bandFromSalary(data.desiredSalaryMin, data.desiredSalaryMax),
        employmentType: data.employmentType || "",
        desiredLocation: data.desiredLocation || "",
        remotePreference: data.remotePreference || "",
        cvFile: data.cvFile || "", cvText: data.cvText || "",
      })
      try { setSkills(JSON.parse(data.skills || "[]")) } catch { setSkills([]) }
      try { setDesiredSectors(JSON.parse(data.desiredSectors || "[]")) } catch { setDesiredSectors([]) }
      setExperiences(data.experiences || [])
      setEducations(data.educations || [])
      setCertificates(data.certificates || [])
      setCompletion({ percentage: data.profileComplete || 0, incomplete: data.incomplete || [] })
    }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  async function saveProfile() {
    setSaving(true)
    setMessage("")
    const band = SALARY_BANDS.find((b) => b.label === profile.salaryBand)
    const res = await fetch("/api/candidates/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile,
        skills,
        desiredSectors,
        employmentType: profile.employmentType || null,
        desiredSalaryMin: band ? band.min : null,
        desiredSalaryMax: band ? band.max : null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setCompletion({ percentage: data.profileComplete, incomplete: data.incomplete || [] })
      setMessage("Profile saved successfully")
    } else {
      setMessage("Failed to save profile")
    }
    setSaving(false)
    setTimeout(() => setMessage(""), 3000)
  }

  async function addExperience(exp: Experience) {
    const res = await fetch("/api/candidates/experience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exp),
    })
    if (res.ok) {
      const data = await res.json()
      setExperiences((prev) => [...prev, data])
      if (data.profileComplete != null) setCompletion((c) => ({ ...c, percentage: data.profileComplete }))
    }
    return res.ok
  }

  async function deleteExperience(id: string) {
    const res = await fetch(`/api/candidates/experience?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      const data = await res.json()
      setExperiences((prev) => prev.filter((e) => e.id !== id))
      if (data.profileComplete != null) setCompletion((c) => ({ ...c, percentage: data.profileComplete }))
    }
  }

  async function addEducation(edu: Education) {
    const res = await fetch("/api/candidates/education", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edu),
    })
    if (res.ok) {
      const data = await res.json()
      setEducations((prev) => [...prev, data])
      if (data.profileComplete != null) setCompletion((c) => ({ ...c, percentage: data.profileComplete }))
    }
    return res.ok
  }

  async function deleteEducation(id: string) {
    const res = await fetch(`/api/candidates/education?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      const data = await res.json()
      setEducations((prev) => prev.filter((e) => e.id !== id))
      if (data.profileComplete != null) setCompletion((c) => ({ ...c, percentage: data.profileComplete }))
    }
  }

  async function addCertificate(cert: Certificate) {
    const res = await fetch("/api/candidates/certificates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cert),
    })
    if (res.ok) {
      const data = await res.json()
      setCertificates((prev) => [...prev, data])
      if (data.profileComplete != null) setCompletion((c) => ({ ...c, percentage: data.profileComplete }))
    }
  }

  async function deleteCertificate(id: string) {
    const res = await fetch(`/api/candidates/certificates?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      const data = await res.json()
      setCertificates((prev) => prev.filter((c) => c.id !== id))
      if (data.profileComplete != null) setCompletion((c) => ({ ...c, percentage: data.profileComplete }))
    }
  }

  async function handleCVParsed(parsed: ParsedCV, fileName: string) {
    setProfile((p) => ({
      ...p,
      cvFile: fileName,
      cvText: parsed.rawText.substring(0, 5000),
      headline: p.headline || parsed.name,
      phone: p.phone || parsed.phone,
      location: p.location || parsed.location,
    }))
    if (parsed.skills.length > 0) {
      setSkills((prev) => Array.from(new Set([...prev, ...parsed.skills])))
    }
    for (const exp of parsed.experience) {
      if (exp.title && exp.company) {
        await addExperience({ title: exp.title, company: exp.company, startDate: exp.startDate, endDate: exp.endDate, current: exp.current, description: exp.description })
      }
    }
    for (const edu of parsed.education) {
      if (edu.institution) {
        await addEducation({ institution: edu.institution, degree: edu.degree, field: edu.field, startDate: edu.startDate, endDate: edu.endDate, current: edu.current })
      }
    }
    for (const cert of parsed.certificates) {
      if (cert.name) {
        await addCertificate({ name: cert.name, issuer: cert.issuer, issueDate: cert.issueDate })
      }
    }
  }

  function addSkill() {
    const s = skillInput.trim()
    if (s && !skills.includes(s)) {
      setSkills([...skills, s])
      setSkillInput("")
    }
  }

  function toggleSector(name: string) {
    setSectorLimitMsg("")
    if (desiredSectors.includes(name)) {
      setDesiredSectors(desiredSectors.filter((s) => s !== name))
      return
    }
    if (desiredSectors.length >= 5) {
      setSectorLimitMsg("Maximum 5 sectors")
      return
    }
    setDesiredSectors([...desiredSectors, name])
  }

  return (
    <>
      <TopBar title="My Profile" notificationCount={0} />
      <div className="p-6 space-y-6 max-w-4xl">
        {completion.percentage < 30 && (
          <div className="bg-gradient-to-r from-[#5B4FE8]/10 to-[#5B4FE8]/5 border border-[#5B4FE8]/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1A1A2E] mb-2">Welcome! Complete your profile to get started</h2>
            <p className="text-sm text-gray-600 mb-4">A complete profile helps employers find you and improves your job match scores. You can upload your CV to auto-fill your profile, or fill it in manually.</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setActiveTab("cv")} className="bg-[#5B4FE8] hover:bg-[#4A3FD8]">
                <Upload className="h-4 w-4 mr-2" />Upload CV to Auto-Fill
              </Button>
              <Button variant="outline" onClick={() => setActiveTab("personal")}>
                <Edit3 className="h-4 w-4 mr-2" />Fill Manually
              </Button>
            </div>
          </div>
        )}

        <ProfileProgress
          percentage={completion.percentage}
          incomplete={completion.incomplete}
          onSectionClick={(section) => {
            const tabMap: Record<string, string> = {
              "Personal Info": "personal", Skills: "skills", Experience: "experience",
              Education: "education", Preferences: "preferences", "CV Upload": "cv",
            }
            setActiveTab(tabMap[section] || "personal")
          }}
        />

        {message && (
          <div className={`p-3 rounded-md text-sm ${message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {message}
          </div>
        )}

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
                <div>
                  <Label htmlFor="headline">Headline</Label>
                  <Input id="headline" placeholder="e.g. Senior Care Assistant" value={profile.headline} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+44 7xxx xxx xxx" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" placeholder="e.g. Manchester" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="photo">Photo URL</Label>
                  <Input id="photo" placeholder="https://..." value={profile.photo} onChange={(e) => setProfile({ ...profile, photo: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" placeholder="Tell employers about yourself..." value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={4} />
              </div>
              <Button onClick={saveProfile} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Personal Info"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="skills">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Add a skill..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                <Button onClick={addSkill} variant="outline"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {s}
                    <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <Button onClick={saveProfile} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Skills"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="experience">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              {experiences.map((exp) => (
                <div key={exp.id} className="border border-gray-100 rounded-md p-4 flex justify-between items-start">
                  <div>
                    <p className="font-medium">{exp.title}</p>
                    <p className="text-sm text-gray-500">{exp.company}{exp.location ? ` - ${exp.location}` : ""}</p>
                    <p className="text-xs text-gray-400">{exp.current ? "Current" : ""}</p>
                  </div>
                  <button type="button" onClick={() => exp.id && deleteExperience(exp.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <ExperienceForm onAdd={addExperience} />
            </div>
          </TabsContent>

          <TabsContent value="education">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              {educations.map((edu) => (
                <div key={edu.id} className="border border-gray-100 rounded-md p-4 flex justify-between items-start">
                  <div>
                    <p className="font-medium">{edu.degree || edu.institution}</p>
                    <p className="text-sm text-gray-500">{edu.institution}{edu.field ? ` - ${edu.field}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => edu.id && deleteEducation(edu.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <EducationForm onAdd={addEducation} />
            </div>
          </TabsContent>

          <TabsContent value="certificates">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="border border-gray-100 rounded-md p-4 flex justify-between items-start">
                  <div>
                    <p className="font-medium">{cert.name}</p>
                    <p className="text-sm text-gray-500">{cert.issuer || ""}</p>
                  </div>
                  <button type="button" onClick={() => cert.id && deleteCertificate(cert.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <CertificateForm onAdd={addCertificate} />
            </div>
          </TabsContent>

          <TabsContent value="cv">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <CVUpload
                onParsed={handleCVParsed}
                onSave={(parsed, fileName) => {
                  handleCVParsed(parsed, fileName)
                  saveProfile()
                }}
              />
              {profile.cvFile && (
                <p className="mt-3 text-sm text-gray-500">Current CV: {profile.cvFile}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preferences">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div>
                <Label>Desired Sector (up to 5)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sectors.map((s) => {
                    const selected = desiredSectors.includes(s.name)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSector(s.name)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selected ? "bg-primary text-white border-primary" : "bg-white text-gray-700 border-gray-300 hover:border-primary"}`}
                      >
                        {s.name}
                      </button>
                    )
                  })}
                </div>
                {sectorLimitMsg && <p className="text-xs text-red-600 mt-1">{sectorLimitMsg}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salaryBand">Desired Salary</Label>
                  <Select id="salaryBand" value={profile.salaryBand} onChange={(e) => setProfile({ ...profile, salaryBand: e.target.value })}>
                    <option value="">Not specified</option>
                    {SALARY_BANDS.map((b) => <option key={b.label} value={b.label}>{b.label}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select id="employmentType" value={profile.employmentType} onChange={(e) => setProfile({ ...profile, employmentType: e.target.value })}>
                    <option value="">Not specified</option>
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="BOTH">Both</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="desiredLocation">Preferred Location</Label>
                  <Input id="desiredLocation" placeholder="e.g. London" value={profile.desiredLocation} onChange={(e) => setProfile({ ...profile, desiredLocation: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="remote">Remote Preference</Label>
                  <Select id="remote" value={profile.remotePreference} onChange={(e) => setProfile({ ...profile, remotePreference: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="REMOTE">Remote Only</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ON_SITE">On-site Only</option>
                    <option value="FLEXIBLE">Flexible</option>
                  </Select>
                </div>
              </div>
              <Button onClick={saveProfile} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="social">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div>
                <Label htmlFor="linkedIn">LinkedIn</Label>
                <Input id="linkedIn" placeholder="https://linkedin.com/in/..." value={profile.linkedIn} onChange={(e) => setProfile({ ...profile, linkedIn: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="github">GitHub</Label>
                <Input id="github" placeholder="https://github.com/..." value={profile.github} onChange={(e) => setProfile({ ...profile, github: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="portfolio">Portfolio</Label>
                <Input id="portfolio" placeholder="https://..." value={profile.portfolio} onChange={(e) => setProfile({ ...profile, portfolio: e.target.value })} />
              </div>
              <Button onClick={saveProfile} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Social Links"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function ExperienceForm({ onAdd }: { onAdd: (exp: Experience) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Experience>({ title: "", company: "", current: false })

  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Experience</Button>

  return (
    <div className="border border-gray-200 rounded-md p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label>Job Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
        <div><Label>Location</Label><Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
        <div><Label>Start Date</Label><Input type="date" value={form.startDate || ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
        <div><Label>End Date</Label><Input type="date" value={form.endDate || ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} disabled={form.current} /></div>
        <div className="flex items-center gap-2 pt-6"><input type="checkbox" checked={form.current} onChange={(e) => setForm({ ...form, current: e.target.checked })} /><Label>Current role</Label></div>
      </div>
      <div><Label>Description</Label><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
      <div className="flex gap-2">
        <Button onClick={() => { onAdd(form); setForm({ title: "", company: "", current: false }); setOpen(false) }} disabled={!form.title || !form.company}>Add</Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}

function EducationForm({ onAdd }: { onAdd: (edu: Education) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Education>({ institution: "", current: false })

  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Education</Button>

  return (
    <div className="border border-gray-200 rounded-md p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label>Institution</Label><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></div>
        <div><Label>Degree</Label><Input value={form.degree || ""} onChange={(e) => setForm({ ...form, degree: e.target.value })} /></div>
        <div><Label>Field of Study</Label><Input value={form.field || ""} onChange={(e) => setForm({ ...form, field: e.target.value })} /></div>
        <div><Label>Start Date</Label><Input type="date" value={form.startDate || ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
        <div><Label>End Date</Label><Input type="date" value={form.endDate || ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} disabled={form.current} /></div>
        <div className="flex items-center gap-2 pt-6"><input type="checkbox" checked={form.current} onChange={(e) => setForm({ ...form, current: e.target.checked })} /><Label>Currently studying</Label></div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => { onAdd(form); setForm({ institution: "", current: false }); setOpen(false) }} disabled={!form.institution}>Add</Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}

function CertificateForm({ onAdd }: { onAdd: (cert: Certificate) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Certificate>({ name: "" })

  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Certificate</Button>

  return (
    <div className="border border-gray-200 rounded-md p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><Label>Certificate Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Issuer</Label><Input value={form.issuer || ""} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
        <div><Label>Issue Date</Label><Input type="date" value={form.issueDate || ""} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => { onAdd(form); setForm({ name: "" }); setOpen(false) }} disabled={!form.name}>Add</Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}
