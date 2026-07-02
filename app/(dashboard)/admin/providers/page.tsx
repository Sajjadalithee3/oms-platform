"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil } from "lucide-react"

interface Provider {
  id: string
  organisationName: string
  contactEmail: string
  user: { name: string; email: string }
  _count: { learners: number; courses: number; cohorts: number }
  createdAt: string
  learnerQuotaOverride: number | null
  quotaCap: number
  quotaUsed: number
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", organisationName: "", contactEmail: "" })
  const [creating, setCreating] = useState(false)
  const [newCredential, setNewCredential] = useState<{ email: string; password: string; organisationName: string } | null>(null)
  const [error, setError] = useState("")
  const [quotaTarget, setQuotaTarget] = useState<Provider | null>(null)
  const [quotaInput, setQuotaInput] = useState("")
  const [savingQuota, setSavingQuota] = useState(false)

  const fetchProviders = () => {
    fetch("/api/admin/providers").then(r => r.json()).then(d => { setProviders(d); setLoading(false) })
  }

  useEffect(() => { fetchProviders() }, [])

  const createProvider = async () => {
    setCreating(true)
    setError("")
    const res = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) {
      setError(data.error || "Failed to create provider")
      return
    }
    setNewCredential({ email: data.email, password: data.generatedPassword, organisationName: data.organisationName })
    setForm({ name: "", email: "", organisationName: "", contactEmail: "" })
    fetchProviders()
  }

  const saveQuota = async () => {
    if (!quotaTarget) return
    setSavingQuota(true)
    const quota = quotaInput.trim() === "" ? null : Number(quotaInput)
    await fetch(`/api/admin/providers/${quotaTarget.id}/quota`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quota }),
    })
    setSavingQuota(false)
    setQuotaTarget(null)
    fetchProviders()
  }

  const columns: Column<Provider>[] = [
    { key: "organisationName", label: "Organisation", sortable: true },
    { key: "contactEmail", label: "Contact", sortable: true, render: (r) => r.contactEmail || r.user.email },
    { key: "learners", label: "Learners", sortable: true, render: (r) => r._count.learners },
    { key: "courses", label: "Courses", sortable: true, render: (r) => r._count.courses },
    { key: "cohorts", label: "Cohorts", sortable: true, render: (r) => r._count.cohorts },
    { key: "quota", label: "Learner Quota", render: (r) => (
      <div className="flex items-center gap-2">
        <span>{r.quotaUsed} / {r.quotaCap}{r.learnerQuotaOverride != null ? " (override)" : ""}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setQuotaTarget(r); setQuotaInput(r.learnerQuotaOverride != null ? String(r.learnerQuotaOverride) : "") }}
          className="text-gray-400 hover:text-gray-700"
          title="Edit quota"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    ) },
    { key: "createdAt", label: "Joined", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ]

  if (loading) return <><TopBar title="Providers" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Providers" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">{providers.length} providers</span>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setNewCredential(null); setError("") } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Provider</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{newCredential ? "Provider Created" : "New Training Provider"}</DialogTitle></DialogHeader>
              {newCredential ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm font-medium text-green-800">Provider account created:</p>
                    <p className="text-sm mt-1"><strong>Organisation:</strong> {newCredential.organisationName}</p>
                    <p className="text-sm"><strong>Email:</strong> {newCredential.email}</p>
                    <p className="text-sm"><strong>Password:</strong> {newCredential.password}</p>
                  </div>
                  <p className="text-xs text-gray-500">Save these credentials — the password cannot be retrieved later.</p>
                  <Button onClick={() => { setDialogOpen(false); setNewCredential(null) }} className="w-full">Done</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
                  <div><Label>Contact Person Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sarah Johnson" /></div>
                  <div><Label>Login Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="sarah@institute.ac.uk" /></div>
                  <div><Label>Organisation Name</Label><Input value={form.organisationName} onChange={(e) => setForm({ ...form, organisationName: e.target.value })} placeholder="Code Institute" /></div>
                  <div><Label>Contact Email (optional)</Label><Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="info@institute.ac.uk" /></div>
                  <p className="text-xs text-gray-500">A secure password will be auto-generated.</p>
                  <Button onClick={createProvider} disabled={!form.name || !form.email || !form.organisationName || creating} className="w-full">
                    {creating ? "Creating..." : "Create Provider"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
        <DataTable columns={columns} data={providers} exportFilename="providers" searchPlaceholder="Search providers..." />
      </div>
      <Dialog open={!!quotaTarget} onOpenChange={(open) => { if (!open) setQuotaTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Learner Quota — {quotaTarget?.organisationName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Default schedule doubles automatically each month since signup (20 → 40 → 80 → ... capped at 640).
              Leave blank to use the automatic schedule, or set a fixed override.
            </p>
            <div>
              <Label>Quota override</Label>
              <Input
                type="number"
                min={0}
                value={quotaInput}
                onChange={(e) => setQuotaInput(e.target.value)}
                placeholder={`Automatic (currently ${quotaTarget?.quotaCap ?? ""})`}
              />
            </div>
            <Button onClick={saveQuota} disabled={savingQuota} className="w-full">
              {savingQuota ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
