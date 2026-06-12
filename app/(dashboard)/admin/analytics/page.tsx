"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/dashboard/StatCard"
import { Building2, Briefcase, Users, GraduationCap, Search, FileText, Target, TrendingUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"

const COLORS = ["#5B4FE8", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"]

interface OverviewData {
  providers: number
  employers: number
  learners: number
  jobSeekers: number
  jobs: number
  applications: number
  matches: number
  activeJobs: number
  jobsBySector: Array<{ sector: string; count: number }>
  applicationsByStatus: Array<{ status: string; count: number }>
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<OverviewData | null>(null)

  useEffect(() => {
    fetch("/api/analytics/overview").then(r => r.json()).then(setData)
  }, [])

  if (!data) return <><TopBar title="Analytics" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Platform Analytics" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Providers" value={data.providers} icon={<GraduationCap className="h-6 w-6" />} />
          <StatCard title="Employers" value={data.employers} icon={<Building2 className="h-6 w-6" />} />
          <StatCard title="Learners" value={data.learners} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Job Seekers" value={data.jobSeekers} icon={<Search className="h-6 w-6" />} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Jobs" value={data.jobs} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Active Jobs" value={data.activeJobs} icon={<TrendingUp className="h-6 w-6" />} color="bg-green-100 text-green-600" />
          <StatCard title="Applications" value={data.applications} icon={<FileText className="h-6 w-6" />} />
          <StatCard title="Matches" value={data.matches} icon={<Target className="h-6 w-6" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Jobs by Sector</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.jobsBySector}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sector" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#5B4FE8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Applications by Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data.applicationsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} label>
                    {data.applicationsByStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
