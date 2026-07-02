"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { StatCard } from "@/components/dashboard/StatCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, UserX, Bell } from "lucide-react"

interface Learner {
  id: string
  user: { name: string; email: string; lastLoginAt: string | null }
  provider: { organisationName: string }
  profileComplete: number
  courseName: string | null
  [key: string]: unknown
}

export default function AdminLearnersPage() {
  const [learners, setLearners] = useState<Learner[]>([])
  const [loading, setLoading] = useState(true)
  const [nudging, setNudging] = useState<string | null>(null)
  const [nudgingAll, setNudgingAll] = useState(false)

  useEffect(() => {
    fetch("/api/admin/learners").then((r) => r.json()).then((d) => { setLearners(d); setLoading(false) })
  }, [])

  async function nudgeLearner(learner: Learner) {
    setNudging(learner.id)
    await fetch("/api/admin/learners/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerIds: [learner.id] }),
    })
    setNudging(null)
  }

  async function nudgeAllNeverLoggedIn() {
    setNudgingAll(true)
    await fetch("/api/admin/learners/nudge", { method: "POST" })
    setNudgingAll(false)
  }

  const completedCount = learners.filter((l) => l.user.lastLoginAt && l.profileComplete >= 100).length
  const incompleteCount = learners.filter((l) => l.user.lastLoginAt && l.profileComplete < 100).length
  const neverLoggedInCount = learners.filter((l) => !l.user.lastLoginAt).length

  const columns: Column<Learner>[] = [
    { key: "name", label: "Name", render: (row) => row.user?.name || "—" },
    { key: "email", label: "Email", render: (row) => row.user?.email || "—" },
    { key: "provider", label: "Provider", render: (row) => row.provider?.organisationName || "—" },
    { key: "courseName", label: "Course" },
    { key: "profileComplete", label: "Profile %", render: (row) => `${row.profileComplete}%` },
    {
      key: "loginStatus", label: "Login Status",
      render: (row) => row.user.lastLoginAt
        ? <Badge className="bg-green-100 text-green-700">Logged in</Badge>
        : (
          <div className="flex items-center gap-1.5">
            <Badge className="bg-gray-100 text-gray-600">Never logged in</Badge>
            <button
              onClick={(e) => { e.stopPropagation(); nudgeLearner(row) }}
              disabled={nudging === row.id}
              title="Send reminder email"
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-[#5B4FE8] disabled:opacity-50"
            >
              <Bell className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
    },
  ]

  if (loading) return <><TopBar title="Learners" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Learners" />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Completed Profile" value={completedCount} icon={<CheckCircle2 className="h-6 w-6" />} description="Logged in & 100% complete" color="bg-green-100 text-green-700" />
          <StatCard title="Incomplete Profile" value={incompleteCount} icon={<Clock className="h-6 w-6" />} description="Logged in, profile incomplete" color="bg-amber-100 text-amber-700" />
          <StatCard title="Never Logged In" value={neverLoggedInCount} icon={<UserX className="h-6 w-6" />} description="Haven't logged in yet" color="bg-gray-100 text-gray-700" />
        </div>
        {neverLoggedInCount > 0 && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={nudgeAllNeverLoggedIn} disabled={nudgingAll}>
              <Bell className="h-4 w-4 mr-2" />{nudgingAll ? "Sending..." : `Nudge All (${neverLoggedInCount})`}
            </Button>
          </div>
        )}
        <DataTable columns={columns} data={learners} searchPlaceholder="Search learners..." exportFilename="learners" />
      </div>
    </>
  )
}
