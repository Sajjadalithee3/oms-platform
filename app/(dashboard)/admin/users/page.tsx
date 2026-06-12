"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { UserX, UserCheck } from "lucide-react"

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
}

const ROLES = ["ALL", "SUPER_ADMIN", "INTERNAL_STAFF", "TRAINING_PROVIDER", "EMPLOYER", "LEARNER", "JOB_SEEKER"]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState("ALL")

  const fetchUsers = (role?: string) => {
    const params = new URLSearchParams()
    if (role && role !== "ALL") params.set("role", role)
    fetch(`/api/admin/users?${params}`).then(r => r.json()).then(d => { setUsers(d); setLoading(false) })
  }

  useEffect(() => { fetchUsers(roleFilter) }, [roleFilter])

  const toggleActive = async (user: User) => {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
    })
    fetchUsers(roleFilter)
  }

  const roleLabel = (r: string) => r.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  const columns: Column<User>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "role", label: "Role", sortable: true, render: (r) => <Badge className="bg-primary/10 text-primary">{roleLabel(r.role)}</Badge> },
    { key: "isActive", label: "Status", sortable: true, render: (r) => (
      <Badge className={r.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
        {r.isActive ? "Active" : "Inactive"}
      </Badge>
    )},
    { key: "createdAt", label: "Joined", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: "actions", label: "Actions", render: (r) => (
      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); toggleActive(r) }}>
        {r.isActive ? <UserX className="h-4 w-4 mr-1" /> : <UserCheck className="h-4 w-4 mr-1" />}
        {r.isActive ? "Deactivate" : "Activate"}
      </Button>
    )},
  ]

  if (loading) return <><TopBar title="Users" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="User Management" />
      <div className="p-6">
        <div className="mb-4 flex items-center gap-4">
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            {ROLES.map(r => <option key={r} value={r}>{r === "ALL" ? "All Roles" : roleLabel(r)}</option>)}
          </Select>
          <span className="text-sm text-gray-500">{users.length} users</span>
        </div>
        <DataTable columns={columns} data={users} exportFilename="users" searchPlaceholder="Search users..." />
      </div>
    </>
  )
}
