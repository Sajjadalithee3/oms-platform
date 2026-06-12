"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/dashboard/StatCard"
import { Users, CheckCircle } from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

const RAG_COLORS = { GREEN: "#10B981", AMBER: "#F59E0B", RED: "#EF4444" }

interface ProviderAnalytics {
  totalLearners: number
  ragBreakdown: { GREEN: number; AMBER: number; RED: number }
  ms1: number
  ms2: number
  ms3: number
}

export default function ProviderAnalyticsPage() {
  const [data, setData] = useState<ProviderAnalytics | null>(null)

  useEffect(() => {
    fetch("/api/analytics/overview").then(r => r.json()).then(setData)
  }, [])

  if (!data) return <><TopBar title="Analytics" /><div className="p-6 text-gray-500">Loading...</div></>

  const ragData = [
    { name: "Green", value: data.ragBreakdown.GREEN },
    { name: "Amber", value: data.ragBreakdown.AMBER },
    { name: "Red", value: data.ragBreakdown.RED },
  ].filter(d => d.value > 0)

  const milestoneData = [
    { name: "Milestone 1", achieved: data.ms1, total: data.totalLearners },
    { name: "Milestone 2", achieved: data.ms2, total: data.totalLearners },
    { name: "Milestone 3", achieved: data.ms3, total: data.totalLearners },
  ]

  return (
    <>
      <TopBar title="Provider Analytics" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Learners" value={data.totalLearners} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Green RAG" value={data.ragBreakdown.GREEN} icon={<CheckCircle className="h-6 w-6" />} color="bg-green-100 text-green-600" />
          <StatCard title="Amber RAG" value={data.ragBreakdown.AMBER} icon={<CheckCircle className="h-6 w-6" />} color="bg-amber-100 text-amber-600" />
          <StatCard title="Red RAG" value={data.ragBreakdown.RED} icon={<CheckCircle className="h-6 w-6" />} color="bg-red-100 text-red-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>RAG Status Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={ragData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {ragData.map((entry, i) => (
                      <Cell key={i} fill={entry.name === "Green" ? RAG_COLORS.GREEN : entry.name === "Amber" ? RAG_COLORS.AMBER : RAG_COLORS.RED} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Milestone Achievement Funnel</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={milestoneData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="achieved" fill="#5B4FE8" name="Achieved" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" fill="#E5E7EB" name="Total" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
