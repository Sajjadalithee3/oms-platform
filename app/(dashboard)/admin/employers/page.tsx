"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"

interface Employer {
  id: string
  companyName: string
  sector: string
  contactEmail: string
  user: { name: string; email: string }
  _count: { jobs: number; interviews: number }
  createdAt: string
}

export default function AdminEmployersPage() {
  const [employers, setEmployers] = useState<Employer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/employers").then(r => r.json()).then(d => { setEmployers(d); setLoading(false) })
  }, [])

  const columns: Column<Employer>[] = [
    { key: "companyName", label: "Company", sortable: true },
    { key: "sector", label: "Sector", sortable: true },
    { key: "contactEmail", label: "Contact", sortable: true, render: (r) => r.contactEmail || r.user.email },
    { key: "jobs", label: "Jobs", sortable: true, render: (r) => r._count.jobs },
    { key: "interviews", label: "Interviews", sortable: true, render: (r) => r._count.interviews },
    { key: "createdAt", label: "Joined", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ]

  if (loading) return <><TopBar title="Employers" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Employers" />
      <div className="p-6">
        <DataTable columns={columns} data={employers} exportFilename="employers" searchPlaceholder="Search employers..." />
      </div>
    </>
  )
}
