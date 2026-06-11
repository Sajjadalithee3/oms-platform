import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { Briefcase, FileText, UserCheck, Calendar } from "lucide-react"

export default async function EmployerDashboard() {
  const session = await auth()

  const employer = await prisma.employerProfile.findUnique({
    where: { userId: session!.user.id },
  })

  if (!employer) {
    return <div className="p-6">Employer profile not found.</div>
  }

  const [activeJobs, totalApplications, interviewCount, shortlistedCount, notifications] = await Promise.all([
    prisma.job.count({ where: { employerId: employer.id, status: "ACTIVE" } }),
    prisma.application.count({ where: { job: { employerId: employer.id } } }),
    prisma.interview.count({ where: { employerId: employer.id } }),
    prisma.application.count({ where: { job: { employerId: employer.id }, status: "SHORTLISTED" } }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  return (
    <>
      <TopBar title="Employer Overview" notificationCount={notifications} />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Jobs" value={activeJobs} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Applications" value={totalApplications} icon={<FileText className="h-6 w-6" />} />
          <StatCard title="Interviews" value={interviewCount} icon={<Calendar className="h-6 w-6" />} />
          <StatCard title="Shortlisted" value={shortlistedCount} icon={<UserCheck className="h-6 w-6" />} />
        </div>
      </div>
    </>
  )
}
