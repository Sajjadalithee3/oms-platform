"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Save, Building2 } from "lucide-react"

export default function EmployerProfilePage() {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const [profile, setProfile] = useState({
    companyName: "", companyLogo: "", industry: "", companySize: "",
    location: "", website: "", description: "", linkedIn: "", twitter: "",
  })

  useEffect(() => {
    fetch("/api/employers/profile").then((r) => r.json()).then((data) => {
      if (!data.error) {
        setProfile({
          companyName: data.companyName || "", companyLogo: data.companyLogo || "",
          industry: data.industry || "", companySize: data.companySize || "",
          location: data.location || "", website: data.website || "",
          description: data.description || "", linkedIn: data.linkedIn || "",
          twitter: data.twitter || "",
        })
        setIsVerified(data.isVerified || false)
      }
    })
  }, [])

  async function handleSave() {
    setSaving(true); setMessage("")
    const res = await fetch("/api/employers/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    })
    setMessage(res.ok ? "Profile saved successfully" : "Failed to save profile")
    setSaving(false); setTimeout(() => setMessage(""), 3000)
  }

  return (
    <>
      <TopBar title="Company Profile" notificationCount={0} />
      <div className="p-6 max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-[#1A1A2E]">{profile.companyName || "Your Company"}</h2>
            {isVerified ? <Badge>Verified</Badge> : <Badge variant="outline">Unverified</Badge>}
          </div>
        </div>

        {message && <div className={`p-3 rounded-md text-sm ${message.includes("success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{message}</div>}

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Company Name</Label><Input value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} /></div>
            <div><Label>Logo URL</Label><Input value={profile.companyLogo} onChange={(e) => setProfile({ ...profile, companyLogo: e.target.value })} placeholder="https://..." /></div>
            <div>
              <Label>Industry</Label>
              <Select value={profile.industry} onChange={(e) => setProfile({ ...profile, industry: e.target.value })}>
                <option value="">Select industry...</option>
                <option value="Technology">Technology</option>
                <option value="Health & Social Care">Health & Social Care</option>
                <option value="Finance">Finance</option>
                <option value="Education">Education</option>
                <option value="Construction">Construction</option>
                <option value="Marketing & Sales">Marketing & Sales</option>
                <option value="Logistics">Logistics</option>
                <option value="General">General</option>
              </Select>
            </div>
            <div>
              <Label>Company Size</Label>
              <Select value={profile.companySize} onChange={(e) => setProfile({ ...profile, companySize: e.target.value })}>
                <option value="">Select size...</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </Select>
            </div>
            <div><Label>Location</Label><Input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} /></div>
            <div><Label>Website</Label><Input value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} placeholder="https://..." /></div>
          </div>
          <div><Label>Description</Label><Textarea value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })} rows={4} placeholder="Tell candidates about your company..." /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>LinkedIn</Label><Input value={profile.linkedIn} onChange={(e) => setProfile({ ...profile, linkedIn: e.target.value })} placeholder="https://linkedin.com/company/..." /></div>
            <div><Label>Twitter</Label><Input value={profile.twitter} onChange={(e) => setProfile({ ...profile, twitter: e.target.value })} placeholder="https://twitter.com/..." /></div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>
    </>
  )
}
