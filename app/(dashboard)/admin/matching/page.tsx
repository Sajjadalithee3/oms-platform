"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Save, Target } from "lucide-react"

interface Setting {
  id: string
  key: string
  value: string
}

export default function AdminMatchingPage() {
  const [loading, setLoading] = useState(true)
  const [runningAll, setRunningAll] = useState(false)
  const [threshold, setThreshold] = useState("40")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then((d: Setting[]) => {
      const t = d.find(s => s.key === "min_match_threshold")
      if (t) setThreshold(t.value)
      setLoading(false)
    })
  }, [])

  const saveThreshold = async () => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "min_match_threshold", value: threshold }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const runAll = async () => {
    setRunningAll(true)
    try {
      await fetch("/api/matching/run-all", { method: "POST" })
    } finally {
      setRunningAll(false)
    }
  }

  if (loading) return <><TopBar title="Matching Engine" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Matching Engine" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Match Threshold</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">Minimum match score (0-100) for a job to appear in a candidate&apos;s feed. Lower values show more jobs but with less relevance.</p>
            <div className="flex items-center gap-3">
              <Input type="number" min="0" max="100" value={threshold} onChange={e => setThreshold(e.target.value)} className="w-32" />
              <span className="text-sm text-gray-500">%</span>
              <Button onClick={saveThreshold}><Save className="h-4 w-4 mr-2" />{saved ? "Saved" : "Save"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" />Re-run Matching</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">Re-calculate all match scores across all candidates and jobs. This may take a while for large datasets.</p>
            <Button onClick={runAll} disabled={runningAll}>
              {runningAll ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Running...</> : <><RefreshCw className="h-4 w-4 mr-2" />Run All Matching</>}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Score Weights</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[{ label: "Skills", value: "50pts" }, { label: "Sector", value: "20pts" }, { label: "Location", value: "15pts" }, { label: "Seniority", value: "10pts" }, { label: "Title", value: "5pts" }].map(w => (
                <div key={w.label} className="text-center p-3 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500">{w.label}</p>
                  <p className="text-xl font-bold text-[#1A1A2E]">{w.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
