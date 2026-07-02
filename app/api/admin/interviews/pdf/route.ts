import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { jsPDF } from "jspdf"

const PRIMARY = "#5B4FE8"
const PRIMARY_LIGHT = "#9B93F0"
const PRIMARY_TINT = "#F0EEFF"
const BG = "#F8F9FA"
const TEXT = "#1A1A2E"
const MUTED = "#6B7280"
const BORDER = "#E5E7EB"

function drawLogo(doc: jsPDF, x: number, y: number) {
  doc.setFillColor(PRIMARY_LIGHT)
  doc.roundedRect(x, y + 8, 3, 7, 0.8, 0.8, "F")
  doc.setFillColor(PRIMARY)
  doc.roundedRect(x + 4.5, y + 4, 3, 11, 0.8, 0.8, "F")
  doc.setFillColor(PRIMARY_LIGHT)
  doc.roundedRect(x + 9, y + 0.5, 3, 14.5, 0.8, 0.8, "F")

  doc.setTextColor(PRIMARY)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("EdvanceFE", x + 15, y + 12)
}

function drawGroupTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFillColor(PRIMARY)
  doc.roundedRect(x, y - 3, 3, 3, 0.6, 0.6, "F")
  doc.setTextColor(PRIMARY)
  doc.setFontSize(9.5)
  doc.setFont("helvetica", "bold")
  doc.text(title, x + 6, y)
}

function drawInfoCard(doc: jsPDF, label: string, value: string, x: number, y: number, w: number, h = 16) {
  doc.setFillColor(BG)
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "F")
  doc.setDrawColor(BORDER)
  doc.setLineWidth(0.25)
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "S")

  doc.setFontSize(7)
  doc.setTextColor(MUTED)
  doc.setFont("helvetica", "bold")
  doc.text(label.toUpperCase(), x + 5, y + 5.5)

  doc.setFontSize(9.5)
  doc.setTextColor(TEXT)
  doc.setFont("helvetica", "bold")
  const lines = doc.splitTextToSize(value || "—", w - 10).slice(0, 2)
  doc.text(lines, x + 5, y + 11)
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "INTERNAL_STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const interviewId = searchParams.get("id")
  if (!interviewId) return NextResponse.json({ error: "Interview ID required" }, { status: 400 })

  const interview = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      employer: { include: { user: { select: { name: true, email: true } } } },
      application: {
        include: {
          job: true,
          learner: {
            include: {
              user: { select: { name: true, email: true } },
              provider: { include: { user: { select: { name: true } } } },
            },
          },
          jobSeeker: { include: { user: { select: { name: true, email: true } } } },
        },
      },
    },
  })

  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 })

  const candidateUser = interview.application.learner?.user || interview.application.jobSeeker?.user
  const job = interview.application.job
  const employer = interview.employer

  let jobSkills: string[] = []
  try { jobSkills = JSON.parse(job.requiredSkills || "[]") } catch { /* empty */ }

  let learnerSkills: string[] = []
  if (interview.application.learner) {
    try { learnerSkills = JSON.parse(interview.application.learner.skills || "[]") } catch { /* empty */ }
  } else if (interview.application.jobSeeker) {
    try { learnerSkills = JSON.parse((interview.application.jobSeeker as Record<string, unknown>).skills as string || "[]") } catch { /* empty */ }
  }

  const matchingSkills = learnerSkills.filter(s => jobSkills.some(js => js.toLowerCase() === s.toLowerCase()))

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const pageW = 210
  const margin = 18
  const contentW = pageW - margin * 2
  const gap = 6
  const cardW = (contentW - gap) / 2

  // ===== TOP ACCENT BAR =====
  doc.setFillColor(PRIMARY)
  doc.rect(0, 0, pageW, 3, "F")

  // ===== HEADER WITH LOGO =====
  let y = 10
  drawLogo(doc, margin, y)

  doc.setTextColor(MUTED)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), pageW - margin, y + 8, { align: "right" })
  doc.text(`Ref: EDV-${interview.id.slice(-8).toUpperCase()}`, pageW - margin, y + 13, { align: "right" })

  y += 22

  doc.setDrawColor(BORDER)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // ===== DOCUMENT TITLE =====
  doc.setTextColor(TEXT)
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text("Interview Confirmation", pageW / 2, y, { align: "center" })
  y += 5
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(MUTED)
  doc.text("Official proof of interview invitation issued via EdvanceFE Platform", pageW / 2, y, { align: "center" })
  y += 10

  // ===== INTERVIEW OVERVIEW CARD =====
  const overviewH = 24
  doc.setFillColor(PRIMARY_TINT)
  doc.roundedRect(margin, y, contentW, overviewH, 3, 3, "F")
  doc.setFillColor(PRIMARY)
  doc.roundedRect(margin, y, 3.5, overviewH, 2, 0, "F")
  doc.rect(margin + 1.5, y, 2, overviewH, "F")

  doc.setTextColor(PRIMARY)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Interview Overview", margin + 8, y + 6.5)

  const interviewDate = interview.confirmedSlot
    ? new Date(interview.confirmedSlot).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "Pending confirmation"
  const interviewTime = interview.confirmedSlot
    ? new Date(interview.confirmedSlot).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "—"
  const formatText = interview.meetingLink ? "Online" : interview.location || "TBC"

  doc.setTextColor(TEXT)
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(`Date:  ${interviewDate}`, margin + 8, y + 13.5)
  doc.text(`Time:  ${interviewTime}`, margin + 8, y + 19.5)

  const rightCol = margin + contentW / 2 + 4
  doc.text(`Format:  ${formatText}`, rightCol, y + 16.5)

  y += overviewH + 8

  // ===== CANDIDATE & EMPLOYER =====
  drawGroupTitle(doc, "Candidate & Employer", margin, y)
  y += 6
  drawInfoCard(doc, "Learner Name", candidateUser?.name || "—", margin, y, cardW)
  drawInfoCard(doc, "Employer Offering Job", employer.companyName || "—", margin + cardW + gap, y, cardW)
  y += 16 + 4
  drawInfoCard(doc, "Industry", employer.industry || "—", margin, y, cardW)
  drawInfoCard(doc, "Employer Location", employer.location || "—", margin + cardW + gap, y, cardW)
  y += 16 + 8

  // ===== JOB DETAILS =====
  drawGroupTitle(doc, "Job Details", margin, y)
  y += 6
  drawInfoCard(doc, "Title of the Job Offered", job.title || "—", margin, y, cardW)
  drawInfoCard(doc, "Location", job.location || "—", margin + cardW + gap, y, cardW)
  y += 16 + 4
  const salaryText = job.salaryMin || job.salaryMax
    ? `£${(job.salaryMin || 0).toLocaleString()}${job.salaryMax ? ` – £${job.salaryMax.toLocaleString()}` : ""}${job.salaryPeriod ? ` ${job.salaryPeriod}` : " per annum"}`
    : "Not specified"
  drawInfoCard(doc, "Sector", job.sector || "—", margin, y, cardW)
  drawInfoCard(doc, "Salary Offered", salaryText, margin + cardW + gap, y, cardW)
  y += 16 + 8

  // ===== SKILLS SECTION =====
  drawGroupTitle(doc, "Skills the Vacant Job Wishes to Utilise", margin, y)
  y += 8

  doc.setFillColor(BG)
  const skillsBoxStartY = y
  const skillLines: { skill: string; x: number; y: number }[] = []
  let skillX = margin + 4
  let skillY = y + 5

  if (matchingSkills.length > 0 || jobSkills.length > 0) {
    const skillsToShow = matchingSkills.length > 0 ? matchingSkills : jobSkills
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    for (const skill of skillsToShow) {
      const tw = doc.getTextWidth(skill) + 8
      if (skillX + tw > pageW - margin - 4) { skillX = margin + 4; skillY += 8 }
      skillLines.push({ skill, x: skillX, y: skillY })
      skillX += tw + 3
    }
    const boxH = skillY - skillsBoxStartY + 10

    doc.setFillColor(BG)
    doc.roundedRect(margin, skillsBoxStartY, contentW, boxH, 2.5, 2.5, "F")
    doc.setDrawColor(BORDER)
    doc.roundedRect(margin, skillsBoxStartY, contentW, boxH, 2.5, 2.5, "S")

    for (const item of skillLines) {
      const tw = doc.getTextWidth(item.skill) + 8
      doc.setFillColor(PRIMARY_TINT)
      doc.roundedRect(item.x, item.y - 4, tw, 6.5, 2, 2, "F")
      doc.setTextColor(PRIMARY)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(item.skill, item.x + 4, item.y + 0.5)
    }
    y = skillsBoxStartY + boxH + 8
  } else {
    doc.setFillColor(BG)
    doc.roundedRect(margin, y, contentW, 14, 2.5, 2.5, "F")
    doc.setDrawColor(BORDER)
    doc.roundedRect(margin, y, contentW, 14, 2.5, 2.5, "S")
    doc.setFontSize(9)
    doc.setTextColor(MUTED)
    doc.setFont("helvetica", "italic")
    doc.text("No specific skills listed for this position.", margin + 5, y + 8.5)
    y += 14 + 8
  }

  // ===== MATCH SCORE =====
  if (interview.application.matchScore) {
    const score = Math.min(100, Math.max(0, interview.application.matchScore))

    drawGroupTitle(doc, "Platform Match Score", margin, y)
    y += 8

    doc.setFillColor(BG)
    doc.roundedRect(margin, y, contentW, 14, 2.5, 2.5, "F")
    doc.setDrawColor(BORDER)
    doc.roundedRect(margin, y, contentW, 14, 2.5, 2.5, "S")

    const barX = margin + 5
    const barY = y + 5.5
    const barW = contentW - 30
    const barH = 4

    doc.setFillColor(PRIMARY_TINT)
    doc.roundedRect(barX, barY, barW, barH, 2, 2, "F")
    doc.setFillColor(PRIMARY)
    doc.roundedRect(barX, barY, barW * (score / 100), barH, 2, 2, "F")

    doc.setTextColor(PRIMARY)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text(`${score}%`, barX + barW + 6, barY + 3.5)

    y += 14 + 8
  }

  // ===== FOOTER =====
  const footerY = Math.max(y + 6, 272)
  doc.setDrawColor(BORDER)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY, pageW - margin, footerY)

  doc.setTextColor("#9CA3AF")
  doc.setFontSize(6.5)
  doc.setFont("helvetica", "normal")
  doc.text("This document was auto-generated by the EdvanceFE Occupational Matching Service platform.", pageW / 2, footerY + 4, { align: "center" })
  doc.text("It serves as official confirmation that the above candidate has been invited for an interview.", pageW / 2, footerY + 7.5, { align: "center" })
  doc.text(`Document ID: EDV-${interview.id.slice(-8).toUpperCase()} | Generated by: ${session.user.name || session.user.email}`, pageW / 2, footerY + 11, { align: "center" })

  doc.setFillColor(PRIMARY)
  doc.rect(0, 293, pageW, 4, "F")

  const pdfBuffer = doc.output("arraybuffer")
  const candidateName = (candidateUser?.name || "candidate").replace(/\s+/g, "-").toLowerCase()
  const fileName = `interview-confirmation-${candidateName}-${interview.id.slice(-6)}.pdf`

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  })
}
