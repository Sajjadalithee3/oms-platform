"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"

interface Candidate {
  id: string
  type: string
  name: string
  email: string
  location: string
  skills: string
  profileComplete: number
  ragStatus?: string
  courseSector?: string
  provider?: string
  userId: string
}

export default function StaffCandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("")
  const router = useRouter()

  useEffect(() => {
    const params = typeFilter ? `?type=${typeFilter}` : ""
    fetch(`/api/candidates${params}`).then(r => r.json()).then(d => { setCandidates(d); setLoading(false) })
  }, [typeFilter])

  const ragColor = (s: string) => {
    if (s === "GREEN") return "bg-green-100 text-green-700"
    if (s === "AMBER") return "bg-amber-100 text-amber-700"
    return "bg-red-100 text-red-700"
  }

  const columns: Column<Candidate>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "type", label: "Type", sortable: true, render: (r) => <Badge className={r.type === "LEARNER" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>{r.type === "LEARNER" ? "Learner" : "Job Seeker"}</Badge> },
    { key: "location", label: "Location", sortable: true },
    { key: "profileComplete", label: "Profile %", sortable: true, render: (r) => `${r.profileComplete}%` },
    { key: "ragStatus", label: "RAG", render: (r) => r.ragStatus ? <Badge className={ragColor(r.ragStatus)}>{r.ragStatus}</Badge> : <span className="text-gray-400">N/A</span> },
    { key: "skills", label: "Skills", render: (r) => {
      const s = r.skills ? r.skills.split(",").slice(0, 3) : []
      return <div className="flex gap-1 flex-wrap">{s.map((sk: string) => <Badge key={sk} className="bg-gray-100 text-gray-600 text-xs">{sk.trim()}</Badge>)}</div>
    }},
  ]

  if (loading) return <><TopBar title="Candidates" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="All Candidates" />
      <div className="p-6">
        <div className="mb-4 flex items-center gap-4">
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="jobseeker">Job Seekers</option>
            <option value="learner">Learners</option>
          </Select>
          <span className="text-sm text-gray-500">{candidates.length} candidates</span>
        </div>
        <DataTable
          columns={columns}
          data={candidates}
          exportFilename="candidates"
          searchPlaceholder="Search candidates..."
          onRowClick={(r) => router.push(`/staff/candidates/${(r as unknown as Candidate).userId}`)}
        />
      </div>
    </>
  )
}
