import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { Building2, Briefcase, Users, GraduationCap, Search, FileText, Target, TrendingUp } from "lucide-react"

export default async function AdminDashboard() {
  const session = await auth()

  const [providerCount, employerCount, learnerCount, seekerCount, jobCount, activeJobCount, applicationCount, matchCount, notifications] = await Promise.all([
    prisma.providerProfile.count(),
    prisma.employerProfile.count(),
    prisma.learnerProfile.count(),
    prisma.jobSeekerProfile.count(),
    prisma.job.count(),
    prisma.job.count({ where: { status: "ACTIVE" } }),
    prisma.application.count(),
    prisma.jobMatch.count(),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  const recentAudit = await prisma.auditLog.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return (
    <>
      <TopBar title="Admin Overview" notificationCount={notifications} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Providers" value={providerCount} icon={<GraduationCap className="h-6 w-6" />} />
          <StatCard title="Employers" value={employerCount} icon={<Building2 className="h-6 w-6" />} />
          <StatCard title="Learners" value={learnerCount} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Job Seekers" value={seekerCount} icon={<Search className="h-6 w-6" />} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Jobs" value={jobCount} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Active Jobs" value={activeJobCount} icon={<TrendingUp className="h-6 w-6" />} color="bg-green-100 text-green-600" />
          <StatCard title="Applications" value={applicationCount} icon={<FileText className="h-6 w-6" />} />
          <StatCard title="Matches" value={matchCount} icon={<Target className="h-6 w-6" />} />
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentAudit.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#1A1A2E]">
                    {log.user?.name || "System"} &mdash; {log.action} {log.entity}
                  </p>
                  <p className="text-xs text-gray-500">{log.detail}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {recentAudit.length === 0 && <p className="text-sm text-gray-500">No recent activity.</p>}
          </div>
        </div>
      </div>
    </>
  )
}
