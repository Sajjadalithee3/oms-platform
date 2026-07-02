import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { User, Briefcase, FileText, Upload, Edit3 } from "lucide-react"
import Link from "next/link"

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
      <div className="p-6 space-y-6">
        {jobSeeker.profileComplete < 30 && (
          <div className="bg-gradient-to-r from-[#5B4FE8]/10 to-[#5B4FE8]/5 border border-[#5B4FE8]/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[#1A1A2E] mb-2">Welcome to EdvanceFE!</h2>
            <p className="text-sm text-gray-600 mb-4">Complete your profile to start getting matched with jobs. Upload your CV to auto-fill your profile, or fill it in manually.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/jobseeker/profile?tab=cv" className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-[#5B4FE8] hover:bg-[#4A3FD8]">
                <Upload className="h-4 w-4" />Upload CV to Auto-Fill
              </Link>
              <Link href="/jobseeker/profile" className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50">
                <Edit3 className="h-4 w-4" />Fill Profile Manually
              </Link>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Profile Complete" value={`${jobSeeker.profileComplete}%`} icon={<User className="h-6 w-6" />} href="/jobseeker/profile" />
          <StatCard title="Matched Jobs" value={matchCount} icon={<Briefcase className="h-6 w-6" />} href="/jobseeker/jobs" />
          <StatCard title="Applications" value={applicationCount} icon={<FileText className="h-6 w-6" />} href="/jobseeker/applications" />
        </div>
      </div>
    </>
  )
}
