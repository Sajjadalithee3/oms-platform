"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Plus } from "lucide-react"

interface Setting {
  id: string
  key: string
  value: string
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<string | null>(null)

  const fetchSettings = () => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      setSettings(d)
      const vals: Record<string, string> = {}
      for (const s of d) vals[s.key] = s.value
      setEditValues(vals)
      setLoading(false)
    })
  }

  useEffect(() => { fetchSettings() }, [])

  const saveSetting = async (key: string) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: editValues[key] }),
    })
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
    fetchSettings()
  }

  const addSetting = async () => {
    if (!newKey.trim()) return
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey, value: newValue }),
    })
    setNewKey("")
    setNewValue("")
    fetchSettings()
  }

  if (loading) return <><TopBar title="Settings" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="System Settings" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>Current Settings</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {settings.map(s => (
                <div key={s.id} className="flex items-center gap-3">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded min-w-[200px]">{s.key}</code>
                  <Input value={editValues[s.key] || ""} onChange={e => setEditValues({ ...editValues, [s.key]: e.target.value })} className="flex-1" />
                  <Button size="sm" onClick={() => saveSetting(s.key)} disabled={editValues[s.key] === s.value}>
                    <Save className="h-4 w-4 mr-1" />{saved === s.key ? "Saved" : "Save"}
                  </Button>
                </div>
              ))}
              {settings.length === 0 && <p className="text-sm text-gray-500">No settings configured.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Add Setting</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input placeholder="Setting key" value={newKey} onChange={e => setNewKey(e.target.value)} />
              <Input placeholder="Value" value={newValue} onChange={e => setNewValue(e.target.value)} />
              <Button onClick={addSetting}><Plus className="h-4 w-4 mr-2" />Add</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
