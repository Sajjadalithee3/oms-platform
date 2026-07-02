"use client"

import { useEffect, useRef, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, ImageIcon, Megaphone } from "lucide-react"

interface Ad {
  id: string
  type: string
  imageUrl: string | null
  text: string | null
  externalLink: string | null
  startDate: string
  endDate: string
  isActive: boolean
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ type: "BANNER_IMAGE", imageUrl: "", text: "", externalLink: "", startDate: "", endDate: "" })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  function refresh() {
    fetch("/api/admin/ads").then((r) => r.json()).then(setAds)
  }

  useEffect(() => { refresh() }, [])

  async function uploadImage(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append("image", file)
    const res = await fetch("/api/upload/ad-image", { method: "POST", body: fd })
    setUploading(false)
    if (res.ok) {
      const data = await res.json()
      setForm((f) => ({ ...f, imageUrl: data.url }))
    }
  }

  async function createAd() {
    setError("")
    const res = await fetch("/api/admin/ads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setDialogOpen(false)
      setForm({ type: "BANNER_IMAGE", imageUrl: "", text: "", externalLink: "", startDate: "", endDate: "" })
      refresh()
    } else {
      const data = await res.json()
      setError(data.error || "Failed to create ad")
    }
  }

  async function toggleActive(ad: Ad) {
    await fetch(`/api/admin/ads/${ad.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !ad.isActive }),
    })
    refresh()
  }

  async function deleteAd(id: string) {
    await fetch(`/api/admin/ads/${id}`, { method: "DELETE" })
    refresh()
  }

  const canSubmit = form.startDate && form.endDate && (form.type === "ANNOUNCEMENT_BAR" ? form.text : form.imageUrl)

  return (
    <>
      <TopBar title="Advertisements" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Ad</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Advertisement</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>}
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="BANNER_IMAGE">Banner Image</option>
                    <option value="ANNOUNCEMENT_BAR">Announcement Bar</option>
                  </Select>
                </div>
                {form.type === "BANNER_IMAGE" ? (
                  <div>
                    <Label>Image</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f) }}
                    />
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
                      {uploading ? "Uploading..." : form.imageUrl ? "Change Image" : "Upload Image"}
                    </Button>
                    {form.imageUrl && <img src={form.imageUrl} alt="Ad preview" className="mt-2 rounded-md max-h-40 object-contain border" />}
                  </div>
                ) : (
                  <div>
                    <Label>Text</Label>
                    <Input value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Announcement text" />
                  </div>
                )}
                <div>
                  <Label>External Link (optional)</Label>
                  <Input value={form.externalLink} onChange={(e) => setForm({ ...form, externalLink: e.target.value })} placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <input type="date" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <input type="date" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
                <Button onClick={createAd} disabled={!canSubmit} className="w-full">Create Ad</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => (
            <Card key={ad.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {ad.type === "BANNER_IMAGE" ? <ImageIcon className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                  {ad.type === "BANNER_IMAGE" ? "Banner Image" : "Announcement Bar"}
                </CardTitle>
                <Badge className={ad.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                  {ad.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {ad.imageUrl && <img src={ad.imageUrl} alt="Ad" className="rounded-md max-h-32 object-contain border w-full" />}
                {ad.text && <p className="text-sm text-gray-700">{ad.text}</p>}
                <p className="text-xs text-gray-500">{new Date(ad.startDate).toLocaleDateString()} – {new Date(ad.endDate).toLocaleDateString()}</p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(ad)} className="flex-1">
                    {ad.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteAd(ad.id)} className="text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {ads.length === 0 && <p className="text-gray-500 text-sm col-span-full text-center py-8">No advertisements yet.</p>}
        </div>
      </div>
    </>
  )
}
