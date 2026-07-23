"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Briefcase, Settings, BarChart3, FileText, MessageSquare,
  Building2, GraduationCap, UserCheck, ClipboardList, Search, Target,
  BookOpen, FolderOpen, Shield, LogOut, Menu, X, Megaphone, Tag
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const navByRole: Record<string, NavItem[]> = {
  SUPER_ADMIN: [
    { label: "Overview", href: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Providers", href: "/admin/providers", icon: <GraduationCap className="h-5 w-5" /> },
    { label: "Learners", href: "/admin/learners", icon: <Users className="h-5 w-5" /> },
    { label: "Employers", href: "/admin/employers", icon: <Building2 className="h-5 w-5" /> },
    { label: "Jobs", href: "/admin/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Users", href: "/admin/users", icon: <Users className="h-5 w-5" /> },
    { label: "Sectors", href: "/admin/sectors", icon: <Tag className="h-5 w-5" /> },
    { label: "Scraper", href: "/admin/scraper", icon: <Search className="h-5 w-5" /> },
    { label: "Matching", href: "/admin/matching", icon: <Target className="h-5 w-5" /> },
    { label: "Messages", href: "/admin/messages", icon: <MessageSquare className="h-5 w-5" /> },
    { label: "Interviews", href: "/admin/interviews", icon: <UserCheck className="h-5 w-5" /> },
    { label: "Ads", href: "/admin/ads", icon: <Megaphone className="h-5 w-5" /> },
    { label: "Audit Log", href: "/admin/audit", icon: <Shield className="h-5 w-5" /> },
    { label: "Analytics", href: "/admin/analytics", icon: <BarChart3 className="h-5 w-5" /> },
    { label: "Settings", href: "/admin/settings", icon: <Settings className="h-5 w-5" /> },
  ],
  INTERNAL_STAFF: [
    { label: "Overview", href: "/staff", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Candidates", href: "/staff/candidates", icon: <Users className="h-5 w-5" /> },
    { label: "Jobs", href: "/staff/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Pipeline", href: "/staff/pipeline", icon: <ClipboardList className="h-5 w-5" /> },
    { label: "Matching", href: "/staff/matching", icon: <Target className="h-5 w-5" /> },
    { label: "Analytics", href: "/staff/analytics", icon: <BarChart3 className="h-5 w-5" /> },
  ],
  TRAINING_PROVIDER: [
    { label: "Overview", href: "/provider", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Learners", href: "/provider/learners", icon: <Users className="h-5 w-5" /> },
    { label: "Jobs", href: "/provider/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Courses", href: "/provider/courses", icon: <BookOpen className="h-5 w-5" /> },
    { label: "Cohorts", href: "/provider/cohorts", icon: <FolderOpen className="h-5 w-5" /> },
    { label: "Ads", href: "/provider/ads", icon: <Megaphone className="h-5 w-5" /> },
    { label: "Messages", href: "/provider/messages", icon: <MessageSquare className="h-5 w-5" /> },
    { label: "Analytics", href: "/provider/analytics", icon: <BarChart3 className="h-5 w-5" /> },
  ],
  EMPLOYER: [
    { label: "Overview", href: "/employer", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Profile", href: "/employer/profile", icon: <Building2 className="h-5 w-5" /> },
    { label: "Jobs", href: "/employer/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Applications", href: "/employer/applications", icon: <FileText className="h-5 w-5" /> },
    { label: "Interviews", href: "/employer/interviews", icon: <UserCheck className="h-5 w-5" /> },
    { label: "Messages", href: "/employer/messages", icon: <MessageSquare className="h-5 w-5" /> },
    { label: "Analytics", href: "/employer/analytics", icon: <BarChart3 className="h-5 w-5" /> },
  ],
  LEARNER: [
    { label: "Overview", href: "/learner", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Profile", href: "/learner/profile", icon: <Users className="h-5 w-5" /> },
    { label: "Jobs", href: "/learner/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Applications", href: "/learner/applications", icon: <FileText className="h-5 w-5" /> },
    { label: "Messages", href: "/learner/messages", icon: <MessageSquare className="h-5 w-5" /> },
  ],
  JOB_SEEKER: [
    { label: "Overview", href: "/jobseeker", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Profile", href: "/jobseeker/profile", icon: <Users className="h-5 w-5" /> },
    { label: "Jobs", href: "/jobseeker/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Applications", href: "/jobseeker/applications", icon: <FileText className="h-5 w-5" /> },
    { label: "Messages", href: "/jobseeker/messages", icon: <MessageSquare className="h-5 w-5" /> },
  ],
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  INTERNAL_STAFF: "Internal Staff",
  TRAINING_PROVIDER: "Training Provider",
  EMPLOYER: "Employer",
  LEARNER: "Learner",
  JOB_SEEKER: "Job Seeker",
}

interface SidebarProps {
  role: string
  userName: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = navByRole[role] || []

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-primary">EdvanceFE</h1>
        <p className="text-xs text-gray-400 mt-1">{roleLabels[role]}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== navItems[0].href && pathname.startsWith(item.href + "/"))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-[#1A1A2E]"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {userName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1A1A2E] truncate">{userName}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors w-full mt-1"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-white shadow-md"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      <aside className="hidden md:flex md:flex-col md:w-64 md:min-h-screen bg-white border-r border-gray-200">
        {sidebarContent}
      </aside>
    </>
  )
}
