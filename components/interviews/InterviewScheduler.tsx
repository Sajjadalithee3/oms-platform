"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Video, Plus, Check } from "lucide-react"

interface Interview {
  id: string
  proposedSlots: string
  confirmedSlot: string | null
  status: string
  location: string | null
  meetingLink: string | null
  notes: string | null
}

interface InterviewSchedulerProps {
  applicationId: string
  interview?: Interview | null
  isEmployer: boolean
  onUpdate?: () => void
}

export function InterviewScheduler({ applicationId, interview, isEmployer, onUpdate }: InterviewSchedulerProps) {
  const [slots, setSlots] = useState<string[]>(["", "", ""])
  const [location, setLocation] = useState("")
  const [meetingLink, setMeetingLink] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const parsedSlots: string[] = interview ? JSON.parse(interview.proposedSlots) : []

  async function proposeInterview() {
    const validSlots = slots.filter((s) => s)
    if (validSlots.length === 0) return
    setSubmitting(true)
    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, proposedSlots: validSlots, location, meetingLink, notes }),
    })
    if (res.ok) onUpdate?.()
    setSubmitting(false)
  }

  async function confirmSlot(slot: string) {
    if (!interview) return
    setSubmitting(true)
    const res = await fetch(`/api/interviews/${interview.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmedSlot: slot }),
    })
    if (res.ok) onUpdate?.()
    setSubmitting(false)
  }

  if (interview?.status === "CONFIRMED" && interview.confirmedSlot) {
    return (
      <div className="border rounded-lg p-4 bg-green-50 border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <Check className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-green-800">Interview Confirmed</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{new Date(interview.confirmedSlot).toLocaleDateString()}</span>
            <Clock className="h-4 w-4 text-gray-500 ml-2" />
            <span>{new Date(interview.confirmedSlot).toLocaleTimeString()}</span>
          </div>
          {interview.location && (
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-500" /><span>{interview.location}</span></div>
          )}
          {interview.meetingLink && (
            <div className="flex items-center gap-2"><Video className="h-4 w-4 text-gray-500" /><a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary underline">{interview.meetingLink}</a></div>
          )}
          {interview.notes && <p className="text-gray-600 mt-2">{interview.notes}</p>}
        </div>
      </div>
    )
  }

  if (interview && !isEmployer) {
    return (
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Select a Time Slot</h3>
        <div className="space-y-2">
          {parsedSlots.map((slot, i) => (
            <button key={i} type="button" onClick={() => confirmSlot(slot)} disabled={submitting}
              className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-primary/5 hover:border-primary transition-colors">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{new Date(slot).toLocaleDateString()}</span>
                <Clock className="h-4 w-4 text-gray-500 ml-2" />
                <span>{new Date(slot).toLocaleTimeString()}</span>
              </div>
              <Badge variant="outline">Select</Badge>
            </button>
          ))}
        </div>
        {interview.location && <p className="text-sm text-gray-500 mt-3"><MapPin className="h-4 w-4 inline mr-1" />{interview.location}</p>}
        {interview.meetingLink && <p className="text-sm text-gray-500"><Video className="h-4 w-4 inline mr-1" /><a href={interview.meetingLink} className="text-primary underline">{interview.meetingLink}</a></p>}
      </div>
    )
  }

  if (interview) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold">Waiting for Candidate</h3>
        </div>
        <p className="text-sm text-gray-500">Proposed {parsedSlots.length} time slot(s). Waiting for confirmation.</p>
      </div>
    )
  }

  if (!isEmployer) return null

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4" />Schedule Interview</h3>
      <div className="space-y-3">
        {slots.map((slot, i) => (
          <div key={i}>
            <Label>Slot {i + 1}</Label>
            <Input type="datetime-local" value={slot} onChange={(e) => { const s = [...slots]; s[i] = e.target.value; setSlots(s) }} />
          </div>
        ))}
        <div><Label>Location (optional)</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Office, Floor 3" /></div>
        <div><Label>Meeting Link (optional)</Label><Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="e.g. https://meet.google.com/..." /></div>
        <div><Label>Notes (optional)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Bring portfolio..." /></div>
        <Button onClick={proposeInterview} disabled={submitting || !slots.some((s) => s)} className="w-full">
          Propose Interview Slots
        </Button>
      </div>
    </div>
  )
}
