"use client"

import { useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, Target } from "lucide-react"

export default function StaffMatchingPage() {
  const [runningAll, setRunningAll] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const runAll = async () => {
    setRunningAll(true)
    setResult(null)
    try {
      const res = await fetch("/api/matching/run-all", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setResult(`Matching complete. ${data.matchesCreated || 0} matches created.`)
      } else {
        setResult(data.error || "Failed to run matching.")
      }
    } catch {
      setResult("Error running matching engine.")
    } finally {
      setRunningAll(false)
    }
  }

  return (
    <>
      <TopBar title="Matching Engine" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Run Matching</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Run the matching engine across all candidates and active jobs. This calculates match scores based on skills (50pts), sector (20pts), location (15pts), seniority (10pts), and title (5pts).
            </p>
            <Button onClick={runAll} disabled={runningAll}>
              {runningAll ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Running...</> : <><RefreshCw className="h-4 w-4 mr-2" />Run All Matching</>}
            </Button>
            {result && <p className="text-sm text-green-600 mt-2">{result}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Score Weights</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[{ label: "Skills", value: "50pts", desc: "Keyword overlap" }, { label: "Sector", value: "20pts", desc: "Sector match" }, { label: "Location", value: "15pts", desc: "City/region match" }, { label: "Seniority", value: "10pts", desc: "Level alignment" }, { label: "Title", value: "5pts", desc: "Role title similarity" }].map(w => (
                <div key={w.label} className="text-center p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500">{w.label}</p>
                  <p className="text-2xl font-bold text-[#1A1A2E]">{w.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{w.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
