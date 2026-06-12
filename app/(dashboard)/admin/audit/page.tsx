"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"

interface AuditEntry {
  id: string
  action: string
  entity: string
  entityId: string
  detail: string
  createdAt: string
  user: { name: string; email: string; role: string }
}

const ACTIONS = ["ALL", "CREATE", "UPDATE", "DELETE", "LOGIN", "SIGNUP"]
const ENTITIES = ["ALL", "User", "Job", "Application", "SystemSetting", "JobBoard", "Interview", "Message"]

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [actionFilter, setActionFilter] = useState("ALL")
  const [entityFilter, setEntityFilter] = useState("ALL")

  const fetchLogs = () => {
    const params = new URLSearchParams()
    if (actionFilter !== "ALL") params.set("action", actionFilter)
    if (entityFilter !== "ALL") params.set("entity", entityFilter)
    params.set("limit", "100")
    fetch(`/api/audit?${params}`).then(r => r.json()).then(d => {
      setLogs(d.logs || [])
      setTotal(d.total || 0)
      setLoading(false)
    })
  }

  useEffect(() => { fetchLogs() }, [actionFilter, entityFilter])

  const actionColor = (a: string) => {
    if (a === "CREATE") return "bg-green-100 text-green-700"
    if (a === "UPDATE") return "bg-blue-100 text-blue-700"
    if (a === "DELETE") return "bg-red-100 text-red-700"
    return "bg-gray-100 text-gray-700"
  }

  const columns: Column<AuditEntry>[] = [
    { key: "createdAt", label: "Time", sortable: true, render: (r) => new Date(r.createdAt).toLocaleString() },
    { key: "action", label: "Action", sortable: true, render: (r) => <Badge className={actionColor(r.action)}>{r.action}</Badge> },
    { key: "entity", label: "Entity", sortable: true },
    { key: "user", label: "User", sortable: true, render: (r) => r.user?.name || "System" },
    { key: "detail", label: "Detail", render: (r) => <span className="text-xs text-gray-500 max-w-xs truncate block">{r.detail}</span> },
  ]

  if (loading) return <><TopBar title="Audit Log" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Audit Log" />
      <div className="p-6">
        <div className="mb-4 flex items-center gap-4">
          <Select value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            {ACTIONS.map(a => <option key={a} value={a}>{a === "ALL" ? "All Actions" : a}</option>)}
          </Select>
          <Select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
            {ENTITIES.map(e => <option key={e} value={e}>{e === "ALL" ? "All Entities" : e}</option>)}
          </Select>
          <span className="text-sm text-gray-500">{total} total entries</span>
        </div>
        <DataTable columns={columns} data={logs} exportFilename="audit-log" searchPlaceholder="Search audit log..." />
      </div>
    </>
  )
}
