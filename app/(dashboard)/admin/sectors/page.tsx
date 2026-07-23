"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

interface Sector {
  id: string
  name: string
  isActive: boolean
}

export default function AdminSectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchSectors = () => {
    fetch("/api/admin/sectors").then((r) => r.json()).then((d) => { setSectors(d); setLoading(false) })
  }

  useEffect(() => { fetchSectors() }, [])

  async function addSector() {
    setError("")
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    const res = await fetch("/api/admin/sectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    })
    if (res.ok) {
      setName("")
      fetchSectors()
    } else {
      const data = await res.json()
      setError(data.error || "Failed to add sector")
    }
    setSaving(false)
  }

  async function toggleActive(sector: Sector) {
    await fetch(`/api/admin/sectors/${sector.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !sector.isActive }),
    })
    fetchSectors()
  }

  if (loading) return <><TopBar title="Sectors" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Sectors" />
      <div className="p-6 space-y-6 max-w-2xl">
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Add Sector</p>
            <div className="flex gap-2">
              <Input placeholder="e.g. Health Care" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSector()} />
              <Button onClick={addSector} disabled={saving}><Plus className="h-4 w-4 mr-2" />Add</Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>

        <div className="space-y-2">
          {sectors.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{s.name}</span>
                  <Badge className={s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleActive(s)}>
                  {s.isActive ? "Deactivate" : "Activate"}
                </Button>
              </CardContent>
            </Card>
          ))}
          {sectors.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No sectors yet. Add one above.</p>}
        </div>
      </div>
    </>
  )
}
