"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/dashboard/StatCard"
import { Briefcase, FileText, UserCheck } from "lucide-react"
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"

const COLORS = ["#5B4FE8", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]

interface EmployerData {
  jobs: number
  applications: number
  interviews: number
}

interface AppStatus {
  status: string
  _count: number
}

export default function EmployerAnalyticsPage() {
  const [data, setData] = useState<EmployerData | null>(null)
  const [appStatuses, setAppStatuses] = useState<AppStatus[]>([])

  useEffect(() => {
    fetch("/api/analytics/overview").then(r => r.json()).then(setData)
    fetch("/api/applications").then(r => r.json()).then(apps => {
      const counts: Record<string, number> = {}
      for (const a of apps || []) {
        const s = (a as Record<string, unknown>).status as string
        counts[s] = (counts[s] || 0) + 1
      }
      setAppStatuses(Object.entries(counts).map(([status, count]) => ({ status, _count: count })))
    })
  }, [])

  if (!data) return <><TopBar title="Analytics" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Employer Analytics" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Jobs" value={data.jobs} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Applications" value={data.applications} icon={<FileText className="h-6 w-6" />} />
          <StatCard title="Interviews" value={data.interviews} icon={<UserCheck className="h-6 w-6" />} />
        </div>

        <Card>
          <CardHeader><CardTitle>Applications by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={appStatuses} dataKey="_count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label>
                  {appStatuses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
