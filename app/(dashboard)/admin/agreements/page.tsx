"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"

interface AgreementEntry {
  id: string
  jobTitle: string
  candidateName: string
  agreedAt: string
  employer: { companyName: string; user: { email: string } }
}

export default function AdminAgreementsPage() {
  const [agreements, setAgreements] = useState<AgreementEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/agreements").then((r) => r.json()).then((d) => { setAgreements(d); setLoading(false) })
  }, [])

  const columns: Column<AgreementEntry>[] = [
    { key: "agreedAt", label: "Agreed At", sortable: true, render: (r) => new Date(r.agreedAt).toLocaleString() },
    { key: "employer", label: "Employer", sortable: false, render: (r) => r.employer?.companyName || "—" },
    { key: "employerEmail", label: "Employer Email", sortable: false, render: (r) => r.employer?.user?.email || "—" },
    { key: "candidateName", label: "Candidate" },
    { key: "jobTitle", label: "Job" },
  ]

  if (loading) return <><TopBar title="Agreements" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Agreements" />
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500">
          Every time an employer confirms the candidate-review agreement before viewing a candidate&apos;s profile, it&apos;s logged here for compliance reference.
        </p>
        <DataTable columns={columns} data={agreements} exportFilename="employer-agreements" searchPlaceholder="Search agreements..." />
      </div>
    </>
  )
}
