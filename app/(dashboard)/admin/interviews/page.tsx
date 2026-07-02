"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Calendar, Building2, Users, Briefcase } from "lucide-react"

interface Interview {
  id: string
  status: string
  confirmedSlot: string | null
  proposedSlots: string
  location: string | null
  meetingLink: string | null
  notes: string | null
  createdAt: string
  employer: {
    companyName: string
    companyLogo: string | null
    industry: string | null
  }
  application: {
    matchScore: number | null
    job: { title: string; company: string | null }
    learner: { user: { name: string }; courseName: string | null } | null
    jobSeeker: { user: { name: string } } | null
  }
}

export default function AdminInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/interviews")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInterviews(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleDownloadPdf(interviewId: string) {
    setDownloading(interviewId)
    try {
      const res = await fetch(`/api/admin/interviews/pdf?id=${interviewId}`)
      if (!res.ok) {
        alert("Failed to generate PDF")
        setDownloading(null)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `interview-confirmation-${interviewId.slice(-6)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert("Failed to download PDF")
    }
    setDownloading(null)
  }

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    CONFIRMED: "bg-green-100 text-green-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-red-100 text-red-700",
  }

  return (
    <>
      <TopBar title="Interview Management" notificationCount={0} />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1A1A2E]">All Interviews</h2>
            <p className="text-sm text-gray-500">Download PDF confirmations to share with training providers</p>
          </div>
          <Badge variant="outline" className="text-sm">{interviews.length} total</Badge>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading interviews...</div>
        ) : interviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No interviews scheduled yet</p>
              <p className="text-sm text-gray-400 mt-1">Interviews will appear here when employers schedule them</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {interviews.map((interview) => {
              const candidate = interview.application.learner || interview.application.jobSeeker
              const candidateName = candidate?.user?.name || "Unknown"
              const isLearner = !!interview.application.learner
              const date = interview.confirmedSlot
                ? new Date(interview.confirmedSlot).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "Pending"
              const time = interview.confirmedSlot
                ? new Date(interview.confirmedSlot).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                : ""

              return (
                <Card key={interview.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-[#1A1A2E]">{candidateName}</h3>
                          <Badge className={statusColor[interview.status] || "bg-gray-100 text-gray-700"}>
                            {interview.status}
                          </Badge>
                          {isLearner && (
                            <Badge variant="outline" className="text-xs">Learner</Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                            {interview.application.job.title}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-gray-400" />
                            {interview.employer.companyName}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {date}{time && ` at ${time}`}
                          </span>
                          {interview.application.matchScore !== null && (
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-gray-400" />
                              {interview.application.matchScore}% match
                            </span>
                          )}
                        </div>

                        {isLearner && interview.application.learner?.courseName && (
                          <p className="text-xs text-gray-500">Course: {interview.application.learner.courseName}</p>
                        )}
                      </div>

                      <Button
                        onClick={() => handleDownloadPdf(interview.id)}
                        disabled={downloading === interview.id}
                        className="bg-[#5B4FE8] hover:bg-[#4a3fd0] text-white shrink-0"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {downloading === interview.id ? "Generating..." : "Download PDF"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
