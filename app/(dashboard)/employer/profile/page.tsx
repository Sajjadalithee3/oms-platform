"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { TopBar } from "@/components/dashboard/TopBar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Save, Building2, Upload, X } from "lucide-react"

export default function EmployerProfilePage() {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const [isVerified, setIsVerified] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState({
    companyName: "", companyLogo: "", industry: "", companySize: "",
    location: "", website: "", description: "", linkedIn: "", twitter: "",
  })

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage("")
    const formData = new FormData()
    formData.append("logo", file)
    try {
      const res = await fetch("/api/upload/logo", { method: "POST", body: formData })
      const data = await res.json()
      if (res.ok) {
        setProfile((p) => ({ ...p, companyLogo: data.url }))
      } else {
        setMessage(data.error || "Failed to upload logo")
      }
    } catch {
      setMessage("Failed to upload logo")
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

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
          <div>
            <Label>Company Logo</Label>
            <div className="mt-2 flex items-center gap-4">
              {profile.companyLogo ? (
                <div className="relative h-20 w-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                  <Image src={profile.companyLogo} alt="Company logo" fill className="object-contain p-1" unoptimized />
                  <button
                    type="button"
                    onClick={() => setProfile({ ...profile, companyLogo: "" })}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                  <Building2 className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading..." : "Upload Logo"}
                </Button>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP or SVG. Max 2MB.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Company Name</Label><Input value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} /></div>
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
