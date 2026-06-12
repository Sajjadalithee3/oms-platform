"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface PipelineApp {
  id: string
  status: string
  matchScore: number | null
  createdAt: string
  candidate: string
  jobTitle: string
  company: string
}

const STATUSES = ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFER", "PLACED", "REJECTED"]
const STATUS_COLORS: Record<string, string> = {
  APPLIED: "border-blue-300 bg-blue-50",
  SHORTLISTED: "border-purple-300 bg-purple-50",
  INTERVIEW: "border-amber-300 bg-amber-50",
  OFFER: "border-green-300 bg-green-50",
  PLACED: "border-emerald-300 bg-emerald-50",
  REJECTED: "border-red-300 bg-red-50",
}

export default function StaffPipelinePage() {
  const [apps, setApps] = useState<PipelineApp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/applications").then(r => r.json()).then((data) => {
      const mapped = (data || []).map((a: Record<string, unknown>) => ({
        id: a.id,
        status: a.status,
        matchScore: a.matchScore,
        createdAt: a.createdAt,
        candidate: (a.jobSeeker as Record<string, unknown>)?.user
          ? ((a.jobSeeker as Record<string, unknown>).user as Record<string, unknown>).name
          : (a.learner as Record<string, unknown>)?.user
            ? ((a.learner as Record<string, unknown>).user as Record<string, unknown>).name
            : "Unknown",
        jobTitle: (a.job as Record<string, unknown>)?.title || "Unknown",
        company: ((a.job as Record<string, unknown>)?.employer as Record<string, unknown>)?.companyName || "Unknown",
      }))
      setApps(mapped)
      setLoading(false)
    })
  }, [])

  if (loading) return <><TopBar title="Pipeline" /><div className="p-6 text-gray-500">Loading...</div></>

  const byStatus = (status: string) => apps.filter(a => a.status === status)

  return (
    <>
      <TopBar title="Application Pipeline" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {STATUSES.map(status => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1A1A2E]">{status}</h3>
                <Badge className="bg-gray-100 text-gray-600">{byStatus(status).length}</Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {byStatus(status).map(app => (
                  <Card key={app.id} className={`border-l-4 ${STATUS_COLORS[status]}`}>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium text-[#1A1A2E] truncate">{app.candidate}</p>
                      <p className="text-xs text-gray-500 truncate">{app.jobTitle}</p>
                      <p className="text-xs text-gray-400">{app.company}</p>
                      {app.matchScore !== null && (
                        <Badge className="mt-1 bg-primary/10 text-primary text-xs">{app.matchScore}% match</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
