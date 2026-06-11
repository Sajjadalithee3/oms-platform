import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { Building2, Briefcase, Users, GraduationCap, Search } from "lucide-react"

export default async function AdminDashboard() {
  const session = await auth()

  const [providerCount, employerCount, learnerCount, seekerCount, jobCount, notifications] = await Promise.all([
    prisma.providerProfile.count(),
    prisma.employerProfile.count(),
    prisma.learnerProfile.count(),
    prisma.jobSeekerProfile.count(),
    prisma.job.count(),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  return (
    <>
      <TopBar title="Admin Overview" notificationCount={notifications} />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard title="Providers" value={providerCount} icon={<GraduationCap className="h-6 w-6" />} />
          <StatCard title="Employers" value={employerCount} icon={<Building2 className="h-6 w-6" />} />
          <StatCard title="Learners" value={learnerCount} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Job Seekers" value={seekerCount} icon={<Search className="h-6 w-6" />} />
          <StatCard title="Total Jobs" value={jobCount} icon={<Briefcase className="h-6 w-6" />} />
        </div>
      </div>
    </>
  )
}
