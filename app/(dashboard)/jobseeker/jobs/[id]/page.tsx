"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { MatchBadge } from "@/components/shared/MatchBadge"
import {
  ArrowLeft, MapPin, Briefcase, Building2, Clock, CalendarDays,
  ExternalLink, Globe, GraduationCap, PoundSterling, CheckCircle2, Send
} from "lucide-react"
import { HtmlContent } from "@/components/shared/HtmlContent"

interface Job {
  id: string
  title: string
  company: string
  location: string
  region: string | null
  country: string | null
  state: string | null
  city: string | null
  sector: string
  category: string | null
  jobType: string | null
  contractType: string | null
  workingHours: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string | null
  salaryPeriod: string | null
  description: string
  requiredSkills: string
  experienceLevel: string | null
  qualifications: string | null
  isRemote: boolean
  sourceType: string
  sourceUrl: string | null
  publishedAt: string | null
  expiresAt: string | null
  deadline: string | null
  createdAt: string
  status: string
  employer: {
    companyName: string; companyLogo: string | null; industry: string | null
    location: string | null; website: string | null; description: string | null
  } | null
  _count: { applications: number }
  matchData: { matchScore: number; matchedSkills: string; missingSkills: string } | null
  hasApplied: boolean
}

function safeParse(json: string): string[] {
  try { return JSON.parse(json) } catch { return [] }
}

export default function JobSeekerJobDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [coverNote, setCoverNote] = useState("")

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then(r => r.json())
      .then(data => {
        setJob(data)
        setApplied(data.hasApplied)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleApply = async () => {
    setApplying(true)
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: id, coverNote }),
    })
    if (res.ok) setApplied(true)
    setApplying(false)
  }

  if (loading) return <><TopBar title="Job Details" /><div className="p-6 text-gray-500">Loading...</div></>
  if (!job) return <><TopBar title="Job Details" /><div className="p-6 text-red-500">Job not found.</div></>

  const skills = safeParse(job.requiredSkills)
  const matchedSkills = job.matchData ? safeParse(job.matchData.matchedSkills) : []
  const missingSkills = job.matchData ? safeParse(job.matchData.missingSkills) : []
  const currency = job.salaryCurrency || "£"
  const period = job.salaryPeriod || "year"
  const postedDate = job.publishedAt || job.createdAt
  const locationParts = [job.city, job.state, job.region, job.country].filter(Boolean)

  return (
    <>
      <TopBar title="Job Details" />
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Jobs
        </Button>

        {/* Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {job.sourceType !== "INTERNAL" && (
                    <Badge variant="outline" className="text-xs"><ExternalLink className="h-3 w-3 mr-1" />{job.sourceType}</Badge>
                  )}
                  {job.isRemote && <Badge className="bg-green-100 text-green-700 text-xs">Remote</Badge>}
                  {job.status !== "ACTIVE" && <Badge className="bg-red-100 text-red-700 text-xs">{job.status}</Badge>}
                </div>
                <h1 className="text-2xl font-bold text-[#1A1A2E] mb-1">{job.title}</h1>
                <p className="text-lg text-gray-600 flex items-center gap-2">
                  <Building2 className="h-5 w-5" />{job.company}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{job.sector}</span>
                  {job.jobType && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{job.jobType}</span>}
                  {job.contractType && <span>{job.contractType}</span>}
                  <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />Posted {new Date(postedDate).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                {job.matchData && (
                  <MatchBadge score={job.matchData.matchScore} matchedSkills={matchedSkills} missingSkills={missingSkills} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content — Left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader><CardTitle>Job Description</CardTitle></CardHeader>
              <CardContent>
                {job.description ? (
                  <HtmlContent html={job.description} className="prose prose-sm max-w-none text-gray-700 leading-relaxed" collapsible maxHeight={300} />
                ) : (
                  <p className="text-gray-400">No description provided.</p>
                )}
              </CardContent>
            </Card>

            {/* Required Skills */}
            {skills.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Required Skills</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(skill => {
                      const isMatched = matchedSkills.includes(skill)
                      return (
                        <Badge key={skill} className={isMatched ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600"}>
                          {isMatched && <CheckCircle2 className="h-3 w-3 mr-1" />}{skill}
                        </Badge>
                      )
                    })}
                  </div>
                  {missingSkills.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Skills you could develop:</p>
                      <div className="flex flex-wrap gap-2">
                        {missingSkills.map(skill => (
                          <Badge key={skill} variant="outline" className="text-orange-600 border-orange-200">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Qualifications */}
            {job.qualifications && (
              <Card>
                <CardHeader><CardTitle>Qualifications</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.qualifications}</p>
                </CardContent>
              </Card>
            )}

            {/* Apply Section */}
            <Card>
              <CardHeader><CardTitle>Apply for this Role</CardTitle></CardHeader>
              <CardContent>
                {job.status === "CLOSED" ? (
                  <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
                    This role is no longer accepting applications.
                  </div>
                ) : applied ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-green-700 flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />You have already applied for this position.
                  </div>
                ) : job.sourceUrl ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">This job was sourced externally. Click below to apply on the original posting.</p>
                    <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full"><ExternalLink className="h-4 w-4 mr-2" />Apply on Source Website</Button>
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      value={coverNote}
                      onChange={e => setCoverNote(e.target.value)}
                      placeholder="Write a cover note to stand out (optional)..."
                      rows={4}
                    />
                    <Button onClick={handleApply} disabled={applying} className="w-full">
                      <Send className="h-4 w-4 mr-2" />{applying ? "Submitting..." : "Submit Application"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — Right 1/3 */}
          <div className="space-y-6">
            {/* Key Details */}
            <Card>
              <CardHeader><CardTitle>Key Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(job.salaryMin || job.salaryMax) && (
                  <div className="flex items-start gap-3">
                    <PoundSterling className="h-5 w-5 text-[#5B4FE8] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Salary</p>
                      <p className="text-sm text-gray-500">
                        {currency}{job.salaryMin ? job.salaryMin.toLocaleString() : "?"} - {currency}{job.salaryMax ? job.salaryMax.toLocaleString() : "?"} / {period}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#5B4FE8] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Location</p>
                    <p className="text-sm text-gray-500">{locationParts.length > 0 ? locationParts.join(", ") : job.location}</p>
                    {job.isRemote && <Badge className="bg-green-100 text-green-700 text-xs mt-1">Remote Available</Badge>}
                  </div>
                </div>
                {job.jobType && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-[#5B4FE8] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Job Type</p>
                      <p className="text-sm text-gray-500">{job.jobType}</p>
                    </div>
                  </div>
                )}
                {job.contractType && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-[#5B4FE8] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Contract Type</p>
                      <p className="text-sm text-gray-500">{job.contractType}</p>
                    </div>
                  </div>
                )}
                {job.workingHours && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-[#5B4FE8] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Working Hours</p>
                      <p className="text-sm text-gray-500">{job.workingHours}</p>
                    </div>
                  </div>
                )}
                {job.experienceLevel && (
                  <div className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-[#5B4FE8] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Experience Level</p>
                      <p className="text-sm text-gray-500">{job.experienceLevel}</p>
                    </div>
                  </div>
                )}
                {job.category && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-[#5B4FE8] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Category</p>
                      <p className="text-sm text-gray-500">{job.category}</p>
                    </div>
                  </div>
                )}
                {(job.deadline || job.expiresAt) && (
                  <div className="flex items-start gap-3">
                    <CalendarDays className="h-5 w-5 text-[#5B4FE8] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Deadline</p>
                      <p className="text-sm text-gray-500">{new Date(job.deadline || job.expiresAt!).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                {job.sourceUrl && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-[#5B4FE8] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Source</p>
                      <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#5B4FE8] hover:underline">
                        View Original Posting
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Employer Info */}
            {job.employer && (
              <Card>
                <CardHeader><CardTitle>About the Employer</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-semibold text-[#1A1A2E]">{job.employer.companyName}</p>
                  {job.employer.industry && <p className="text-sm text-gray-500">{job.employer.industry}</p>}
                  {job.employer.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" />{job.employer.location}</p>
                  )}
                  {job.employer.description && (
                    <p className="text-sm text-gray-600 line-clamp-4">{job.employer.description}</p>
                  )}
                  {job.employer.website && (
                    <a href={job.employer.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[#5B4FE8] hover:underline flex items-center gap-1">
                      <Globe className="h-3 w-3" />Company Website
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <Card>
              <CardHeader><CardTitle>Application Info</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-500">{job._count.applications} application{job._count.applications !== 1 ? "s" : ""} submitted</p>
                <p className="text-sm text-gray-500">Posted {new Date(postedDate).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
