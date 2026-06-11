import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { Users, Briefcase, Target } from "lucide-react"

export default async function StaffDashboard() {
  const session = await auth()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [seekerCount, learnerCount, jobsToday, matchesToday, notifications] = await Promise.all([
    prisma.jobSeekerProfile.count(),
    prisma.learnerProfile.count(),
    prisma.job.count({ where: { createdAt: { gte: today } } }),
    prisma.jobMatch.count({ where: { createdAt: { gte: today } } }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  return (
    <>
      <TopBar title="Staff Overview" notificationCount={notifications} />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Active Candidates" value={seekerCount + learnerCount} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Jobs Today" value={jobsToday} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Matches Today" value={matchesToday} icon={<Target className="h-6 w-6" />} />
        </div>
      </div>
    </>
  )
}
