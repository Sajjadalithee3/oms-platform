"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Plus } from "lucide-react"

interface Employer {
  id: string
  companyName: string
  sector: string
  contactEmail: string
  user: { name: string; email: string }
  _count: { jobs: number; interviews: number }
  createdAt: string
}

const SECTORS = ["Technology", "Health & Social Care", "Education", "Finance", "Construction", "Retail", "Manufacturing", "Hospitality"]

export default function AdminEmployersPage() {
  const [employers, setEmployers] = useState<Employer[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", companyName: "", sector: "", contactEmail: "" })
  const [creating, setCreating] = useState(false)
  const [newCredential, setNewCredential] = useState<{ email: string; password: string; companyName: string } | null>(null)
  const [error, setError] = useState("")

  const fetchEmployers = () => {
    fetch("/api/admin/employers").then(r => r.json()).then(d => { setEmployers(d); setLoading(false) })
  }

  useEffect(() => { fetchEmployers() }, [])

  const createEmployer = async () => {
    setCreating(true)
    setError("")
    const res = await fetch("/api/admin/employers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) {
      setError(data.error || "Failed to create employer")
      return
    }
    setNewCredential({ email: data.email, password: data.generatedPassword, companyName: data.companyName })
    setForm({ name: "", email: "", companyName: "", sector: "", contactEmail: "" })
    fetchEmployers()
  }

  const columns: Column<Employer>[] = [
    { key: "companyName", label: "Company", sortable: true },
    { key: "sector", label: "Sector", sortable: true },
    { key: "contactEmail", label: "Contact", sortable: true, render: (r) => r.contactEmail || r.user.email },
    { key: "jobs", label: "Jobs", sortable: true, render: (r) => r._count.jobs },
    { key: "interviews", label: "Interviews", sortable: true, render: (r) => r._count.interviews },
    { key: "createdAt", label: "Joined", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ]

  if (loading) return <><TopBar title="Employers" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Employers" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">{employers.length} employers</span>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setNewCredential(null); setError("") } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Employer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{newCredential ? "Employer Created" : "New Employer"}</DialogTitle></DialogHeader>
              {newCredential ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm font-medium text-green-800">Employer account created:</p>
                    <p className="text-sm mt-1"><strong>Company:</strong> {newCredential.companyName}</p>
                    <p className="text-sm"><strong>Email:</strong> {newCredential.email}</p>
                    <p className="text-sm"><strong>Password:</strong> {newCredential.password}</p>
                  </div>
                  <p className="text-xs text-gray-500">Save these credentials — the password cannot be retrieved later.</p>
                  <Button onClick={() => { setDialogOpen(false); setNewCredential(null) }} className="w-full">Done</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
                  <div><Label>Contact Person Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" /></div>
                  <div><Label>Login Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@techcorp.com" /></div>
                  <div><Label>Company Name</Label><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="TechCorp Ltd" /></div>
                  <div>
                    <Label>Sector</Label>
                    <Select value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}>
                      <option value="">Select sector...</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </div>
                  <div><Label>Contact Email (optional)</Label><Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="hr@techcorp.com" /></div>
                  <p className="text-xs text-gray-500">A secure password will be auto-generated.</p>
                  <Button onClick={createEmployer} disabled={!form.name || !form.email || !form.companyName || creating} className="w-full">
                    {creating ? "Creating..." : "Create Employer"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
        <DataTable columns={columns} data={employers} exportFilename="employers" searchPlaceholder="Search employers..." />
      </div>
    </>
  )
}
