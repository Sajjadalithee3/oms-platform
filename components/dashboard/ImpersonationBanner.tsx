"use client"

import { useRouter } from "next/navigation"
import { Eye, X } from "lucide-react"

interface ImpersonationBannerProps {
  realUserName: string
  viewingAs: string
  viewingRole: string
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Admin",
  INTERNAL_STAFF: "Staff",
  TRAINING_PROVIDER: "Provider",
  EMPLOYER: "Employer",
  LEARNER: "Learner",
  JOB_SEEKER: "Job Seeker",
}

export function ImpersonationBanner({ realUserName, viewingAs, viewingRole }: ImpersonationBannerProps) {
  const router = useRouter()

  async function handleExit() {
    const res = await fetch("/api/admin/impersonate", { method: "DELETE" })
    const data = await res.json()
    router.push(data.redirect || "/admin")
    router.refresh()
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>
          <strong>{realUserName}</strong> viewing as{" "}
          <strong>{viewingAs}</strong> ({roleLabels[viewingRole] || viewingRole})
        </span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition-colors font-medium"
      >
        <X className="h-3.5 w-3.5" />
        Exit View
      </button>
    </div>
  )
}
