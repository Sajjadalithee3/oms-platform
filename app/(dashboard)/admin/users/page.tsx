"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { DataTable, Column } from "@/components/shared/DataTable"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { UserX, UserCheck, Plus, Eye, Pencil, Trash2, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
}

const ROLES = ["ALL", "SUPER_ADMIN", "INTERNAL_STAFF", "TRAINING_PROVIDER", "EMPLOYER", "LEARNER", "JOB_SEEKER"]
const CREATE_ROLES = ["INTERNAL_STAFF", "TRAINING_PROVIDER", "EMPLOYER", "LEARNER", "JOB_SEEKER"]
const EDIT_ROLES = ["INTERNAL_STAFF", "TRAINING_PROVIDER", "EMPLOYER", "LEARNER", "JOB_SEEKER"]

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", role: "LEARNER" })
  const [creating, setCreating] = useState(false)
  const [newCredential, setNewCredential] = useState<{ email: string; password: string; name: string; role: string } | null>(null)
  const [error, setError] = useState("")

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ name: "", email: "", newPassword: "", role: "" })
  const [editError, setEditError] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)

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

  const createUser = async () => {
    setCreating(true)
    setError("")
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) {
      setError(data.error || "Failed to create user")
      return
    }
    setNewCredential({ email: data.email, password: data.generatedPassword, name: data.name, role: data.role })
    setForm({ name: "", email: "", role: "LEARNER" })
    fetchUsers(roleFilter)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setEditForm({ name: user.name || "", email: user.email, newPassword: "", role: user.role })
    setEditError("")
    setEditDialogOpen(true)
  }

  const saveEdit = async () => {
    if (!editingUser) return
    setEditSaving(true)
    setEditError("")
    const res = await fetch(`/api/admin/users/${editingUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setEditSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setEditError(data.error || "Failed to update user")
      return
    }
    setEditDialogOpen(false)
    fetchUsers(roleFilter)
  }

  const openDeleteDialog = (user: User) => {
    setDeletingUser(user)
    setDeleteConfirm("")
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingUser) return
    setDeleting(true)
    const res = await fetch(`/api/admin/users/${deletingUser.id}`, { method: "DELETE" })
    setDeleting(false)
    if (!res.ok) {
      const data = await res.json()
      alert(data.error || "Failed to delete user")
      return
    }
    setDeleteDialogOpen(false)
    fetchUsers(roleFilter)
  }

  const impersonate = async (user: User) => {
    const res = await fetch("/api/admin/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    })
    const data = await res.json()
    if (res.ok && data.redirect) {
      router.push(data.redirect)
      router.refresh()
    }
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
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); impersonate(r) }} title={`View as ${r.name}`}>
          <Eye className="h-4 w-4 mr-1" />View As
        </Button>
        <button onClick={(e) => { e.stopPropagation(); openEditDialog(r) }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-[#5B4FE8]" title="Edit user">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); toggleActive(r) }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600" title={r.isActive ? "Deactivate" : "Activate"}>
          {r.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
        </button>
        {r.role !== "SUPER_ADMIN" && (
          <button onClick={(e) => { e.stopPropagation(); openDeleteDialog(r) }} className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" title="Delete user">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    )},
  ]

  if (loading) return <><TopBar title="Users" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="User Management" />
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r === "ALL" ? "All Roles" : roleLabel(r)}</option>)}
            </Select>
            <span className="text-sm text-gray-500">{users.length} users</span>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setNewCredential(null); setError("") } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{newCredential ? "User Created" : "New User"}</DialogTitle></DialogHeader>
              {newCredential ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-sm font-medium text-green-800">Login credentials generated:</p>
                    <p className="text-sm mt-1"><strong>Name:</strong> {newCredential.name}</p>
                    <p className="text-sm"><strong>Email:</strong> {newCredential.email}</p>
                    <p className="text-sm"><strong>Password:</strong> {newCredential.password}</p>
                    <p className="text-sm"><strong>Role:</strong> {roleLabel(newCredential.role)}</p>
                  </div>
                  <p className="text-xs text-gray-500">Save these credentials — the password cannot be retrieved later.</p>
                  <Button onClick={() => { setDialogOpen(false); setNewCredential(null) }} className="w-full">Done</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
                  <div><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Smith" /></div>
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" /></div>
                  <div>
                    <Label>Role</Label>
                    <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      {CREATE_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                    </Select>
                  </div>
                  <p className="text-xs text-gray-500">A secure password will be auto-generated.</p>
                  <Button onClick={createUser} disabled={!form.name || !form.email || creating} className="w-full">
                    {creating ? "Creating..." : "Create User"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
        <DataTable columns={columns} data={users} exportFilename="users" searchPlaceholder="Search users..." />
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editError && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{editError}</div>}
            <div><Label>Full Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
            <div>
              <Label>New Password <span className="text-xs text-gray-400">(leave blank to keep current)</span></Label>
              <Input type="password" value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} placeholder="Min. 6 characters" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                {EDIT_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </Select>
            </div>
            <Button onClick={saveEdit} disabled={editSaving || !editForm.name || !editForm.email} className="w-full">
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" />Delete User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                This will permanently delete <strong>{deletingUser?.name}</strong> ({deletingUser?.email}) and all their associated data including profile, applications, messages, matches, and jobs.
              </p>
              <p className="text-xs text-red-600 mt-1">Role: {deletingUser ? roleLabel(deletingUser.role) : ""}</p>
            </div>
            <div>
              <Label>Type <strong>DELETE</strong> to confirm</Label>
              <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={confirmDelete} disabled={deleteConfirm !== "DELETE" || deleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {deleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
