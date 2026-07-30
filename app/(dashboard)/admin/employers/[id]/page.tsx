"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

interface EmployerDetail {
  id: string
  companyName: string
  industry: string | null
  location: string | null
  website: string | null
  isVerified: boolean
  isActive: boolean
  contactEmail: string | null
  contactPhone: string | null
  user: { name: string; email: string }
  _count: { jobs: number; interviews: number }
  createdAt: string
}

interface ActivityRow {
  applicationId: string
  candidateName: string
  jobTitle: string
  agreedAt: string
  viewCount: number
  lastViewedAt: string
}

export default function AdminEmployerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [employer, setEmployer] = useState<EmployerDetail | null>(null)
  const [activity, setActivity] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/employers/${params.id}`).then((r) => r.json()).then((d) => {
      setEmployer(d.employer)
      setActivity(d.activity || [])
      setLoading(false)
    })
  }, [params.id])

  const columns: Column<ActivityRow>[] = [
    { key: "candidateName", label: "Candidate" },
    { key: "jobTitle", label: "Job" },
    { key: "agreedAt", label: "Agreed At", sortable: true, render: (r) => new Date(r.agreedAt).toLocaleString() },
    { key: "viewCount", label: "Times Viewed", sortable: true },
    { key: "lastViewedAt", label: "Last Viewed", sortable: true, render: (r) => new Date(r.lastViewedAt).toLocaleString() },
  ]

  if (loading || !employer) return <><TopBar title="Employer" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title={employer.companyName} />
      <div className="p-6 space-y-4">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" />Back</button>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Candidate Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="bg-white rounded-lg border p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Company</p><p className="font-medium">{employer.companyName}</p></div>
              <div><p className="text-sm text-gray-500">Contact</p><p className="font-medium">{employer.user.name} &middot; {employer.contactEmail || employer.user.email}</p></div>
              <div><p className="text-sm text-gray-500">Industry</p><p className="font-medium">{employer.industry || "—"}</p></div>
              <div><p className="text-sm text-gray-500">Location</p><p className="font-medium">{employer.location || "—"}</p></div>
              <div><p className="text-sm text-gray-500">Jobs Posted</p><p className="font-medium">{employer._count.jobs}</p></div>
              <div><p className="text-sm text-gray-500">Interviews</p><p className="font-medium">{employer._count.interviews}</p></div>
              <div><p className="text-sm text-gray-500">Status</p><Badge className={employer.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{employer.isActive ? "Active" : "Inactive"}</Badge></div>
              <div><p className="text-sm text-gray-500">Joined</p><p className="font-medium">{new Date(employer.createdAt).toLocaleDateString()}</p></div>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="bg-white rounded-lg border p-4">
              <p className="text-sm text-gray-500 mb-3">Every candidate this employer has agreed to review, how many times they&apos;ve viewed the profile, and when they last looked.</p>
              <DataTable columns={columns} data={activity} exportFilename={`${employer.companyName}-activity`} searchPlaceholder="Search activity..." />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
