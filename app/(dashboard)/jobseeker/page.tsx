import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { User, Briefcase, FileText } from "lucide-react"

export default async function JobSeekerDashboard() {
  const session = await auth()

  const jobSeeker = await prisma.jobSeekerProfile.findUnique({
    where: { userId: session!.user.id },
  })

  if (!jobSeeker) {
    return <div className="p-6">Job seeker profile not found.</div>
  }

  const [matchCount, applicationCount, notifications] = await Promise.all([
    prisma.jobMatch.count({ where: { jobSeekerId: jobSeeker.id } }),
    prisma.application.count({ where: { jobSeekerId: jobSeeker.id } }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  return (
    <>
      <TopBar title="Job Seeker Overview" notificationCount={notifications} />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Profile Complete" value={`${jobSeeker.profileComplete}%`} icon={<User className="h-6 w-6" />} />
          <StatCard title="Matched Jobs" value={matchCount} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Applications" value={applicationCount} icon={<FileText className="h-6 w-6" />} />
        </div>
      </div>
    </>
  )
}
