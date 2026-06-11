import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { Users, UserCheck, Award, AlertTriangle } from "lucide-react"

export default async function ProviderDashboard() {
  const session = await auth()

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session!.user.id },
  })

  if (!provider) {
    return <div className="p-6">Provider profile not found.</div>
  }

  const [totalLearners, activeLearners, ms2Count, ms3Count, greenCount, amberCount, redCount, notifications] = await Promise.all([
    prisma.learnerProfile.count({ where: { providerId: provider.id } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ragStatus: { not: "RED" } } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ms2Achieved: true } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ms3Achieved: true } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ragStatus: "GREEN" } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ragStatus: "AMBER" } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ragStatus: "RED" } }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  return (
    <>
      <TopBar title="Provider Overview" notificationCount={notifications} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Learners" value={totalLearners} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Active Learners" value={activeLearners} icon={<UserCheck className="h-6 w-6" />} />
          <StatCard title="MS2 Achieved" value={ms2Count} icon={<Award className="h-6 w-6" />} />
          <StatCard title="MS3 Achieved" value={ms3Count} icon={<Award className="h-6 w-6" />} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Green" value={greenCount} icon={<Users className="h-6 w-6" />} color="bg-green-100 text-green-600" />
          <StatCard title="Amber" value={amberCount} icon={<AlertTriangle className="h-6 w-6" />} color="bg-amber-100 text-amber-600" />
          <StatCard title="Red" value={redCount} icon={<AlertTriangle className="h-6 w-6" />} color="bg-red-100 text-red-600" />
        </div>
      </div>
    </>
  )
}
