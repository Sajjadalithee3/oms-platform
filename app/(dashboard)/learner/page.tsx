import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { User, Briefcase, FileText, Award } from "lucide-react"

export default async function LearnerDashboard() {
  const session = await auth()

  const learner = await prisma.learnerProfile.findUnique({
    where: { userId: session!.user.id },
  })

  if (!learner) {
    return <div className="p-6">Learner profile not found.</div>
  }

  const [matchCount, applicationCount, notifications] = await Promise.all([
    prisma.jobMatch.count({ where: { learnerId: learner.id } }),
    prisma.application.count({ where: { learnerId: learner.id } }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  const milestonesAchieved = [learner.ms1Achieved, learner.ms2Achieved, learner.ms3Achieved].filter(Boolean).length

  return (
    <>
      <TopBar title="Learner Overview" notificationCount={notifications} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Profile Complete" value={`${learner.profileComplete}%`} icon={<User className="h-6 w-6" />} />
          <StatCard title="Matched Jobs" value={matchCount} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Applications" value={applicationCount} icon={<FileText className="h-6 w-6" />} />
          <StatCard title="Milestones" value={`${milestonesAchieved}/3`} icon={<Award className="h-6 w-6" />} />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">Milestone Progress</h2>
          <div className="flex items-center gap-4">
            {[
              { label: "MS1", achieved: learner.ms1Achieved, date: learner.ms1Date },
              { label: "MS2", achieved: learner.ms2Achieved, date: learner.ms2Date },
              { label: "MS3", achieved: learner.ms3Achieved, date: learner.ms3Date },
            ].map((ms, i) => (
              <div key={ms.label} className="flex items-center gap-2">
                {i > 0 && <div className={`h-0.5 w-8 ${ms.achieved ? "bg-primary" : "bg-gray-200"}`} />}
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    ms.achieved ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {ms.label}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
              learner.ragStatus === "GREEN" ? "bg-green-100 text-green-700" :
              learner.ragStatus === "AMBER" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>
              RAG: {learner.ragStatus}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
