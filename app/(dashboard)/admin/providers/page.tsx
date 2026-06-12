"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"

interface Provider {
  id: string
  organisationName: string
  contactEmail: string
  user: { name: string; email: string }
  _count: { learners: number; courses: number; cohorts: number }
  createdAt: string
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/providers").then(r => r.json()).then(d => { setProviders(d); setLoading(false) })
  }, [])

  const columns: Column<Provider>[] = [
    { key: "organisationName", label: "Organisation", sortable: true },
    { key: "contactEmail", label: "Contact", sortable: true, render: (r) => r.contactEmail || r.user.email },
    { key: "learners", label: "Learners", sortable: true, render: (r) => r._count.learners },
    { key: "courses", label: "Courses", sortable: true, render: (r) => r._count.courses },
    { key: "cohorts", label: "Cohorts", sortable: true, render: (r) => r._count.cohorts },
    { key: "createdAt", label: "Joined", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ]

  if (loading) return <><TopBar title="Providers" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Providers" />
      <div className="p-6">
        <DataTable columns={columns} data={providers} exportFilename="providers" searchPlaceholder="Search providers..." />
      </div>
    </>
  )
}
