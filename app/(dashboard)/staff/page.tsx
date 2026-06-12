import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { Users, Briefcase, FileText, Target } from "lucide-react"

export default async function StaffDashboard() {
  const session = await auth()

  const [seekerCount, learnerCount, jobCount, applicationCount, matchCount, notifications] = await Promise.all([
    prisma.jobSeekerProfile.count(),
    prisma.learnerProfile.count(),
    prisma.job.count({ where: { status: "ACTIVE" } }),
    prisma.application.count(),
    prisma.jobMatch.count(),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  const recentApps = await prisma.application.findMany({
    include: { job: { select: { title: true } }, jobSeeker: { include: { user: { select: { name: true } } } }, learner: { include: { user: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return (
    <>
      <TopBar title="Staff Overview" notificationCount={notifications} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Job Seekers" value={seekerCount} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Learners" value={learnerCount} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Active Jobs" value={jobCount} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Applications" value={applicationCount} icon={<FileText className="h-6 w-6" />} />
          <StatCard title="Matches" value={matchCount} icon={<Target className="h-6 w-6" />} />
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">Recent Applications</h2>
          <div className="space-y-3">
            {recentApps.map(app => (
              <div key={app.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#1A1A2E]">
                    {app.jobSeeker?.user?.name || app.learner?.user?.name || "Unknown"} applied for {app.job.title}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(app.createdAt).toLocaleString()}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">{app.status}</span>
              </div>
            ))}
            {recentApps.length === 0 && <p className="text-sm text-gray-500">No recent applications.</p>}
          </div>
        </div>
      </div>
    </>
  )
}
