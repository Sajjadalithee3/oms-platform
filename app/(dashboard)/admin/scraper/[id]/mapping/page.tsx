"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Save, Eye, RefreshCw } from "lucide-react"

const PLATFORM_FIELDS = [
  "", "title", "company", "location", "sector", "salaryMin", "salaryMax",
  "description", "sourceUrl", "deadline", "jobType"
]

interface Board {
  id: string
  name: string
  boardType: string
  feedUrl: string
  fieldMappings: string
}

export default function RSSFieldMappingPage() {
  const { id } = useParams()
  const router = useRouter()
  const [board, setBoard] = useState<Board | null>(null)
  const [rssFields, setRssFields] = useState<string[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [sampleItem, setSampleItem] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [customField, setCustomField] = useState("")
  const [allFields, setAllFields] = useState<string[]>(PLATFORM_FIELDS)

  useEffect(() => {
    fetch(`/api/scraper/boards/${id}`).then(r => r.json()).then(b => {
      setBoard(b)
      const existing = b.fieldMappings ? JSON.parse(b.fieldMappings) : {}
      setMappings(existing)
      if (b.feedUrl && b.boardType === "RSS") {
        fetch(`/api/scraper/preview-rss?url=${encodeURIComponent(b.feedUrl)}`)
          .then(r => r.json())
          .then(data => {
            setRssFields(data.fields || [])
            setSampleItem(data.sample || null)
            setLoading(false)
          })
          .catch(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
  }, [id])

  const updateMapping = (rssField: string, platformField: string) => {
    setMappings(prev => ({ ...prev, [rssField]: platformField }))
  }

  const addCustomField = () => {
    if (customField.trim() && !allFields.includes(customField.trim())) {
      setAllFields(prev => [...prev, customField.trim()])
      setCustomField("")
    }
  }

  const save = async () => {
    setSaving(true)
    await fetch(`/api/scraper/boards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldMappings: JSON.stringify(mappings) }),
    })
    setSaving(false)
    router.push("/admin/scraper")
  }

  const previewJob = () => {
    if (!sampleItem) return null
    const mapped: Record<string, string> = {}
    for (const [rssField, platformField] of Object.entries(mappings)) {
      if (platformField && sampleItem[rssField]) {
        mapped[platformField] = sampleItem[rssField]
      }
    }
    return mapped
  }

  if (loading) return <><TopBar title="Field Mapping" /><div className="p-6 text-gray-500">Loading feed...</div></>
  if (!board) return <><TopBar title="Field Mapping" /><div className="p-6 text-red-500">Board not found.</div></>

  const preview = previewJob()

  return (
    <>
      <TopBar title={`Field Mapping: ${board.name}`} />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>Map RSS Fields to Platform Fields</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rssFields.length === 0 ? (
              <p className="text-sm text-gray-500">No fields detected. Make sure the feed URL is valid and returns RSS/Atom XML.</p>
            ) : (
              rssFields.map(field => (
                <div key={field} className="flex items-center gap-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded min-w-[180px]">{field}</code>
                  <span className="text-gray-400">&rarr;</span>
                  <Select
                    value={mappings[field] || ""}
                    onChange={e => updateMapping(field, e.target.value)}
                    className="flex-1"
                  >
                    {allFields.map(pf => (
                      <option key={pf} value={pf}>{pf || "(unmapped)"}</option>
                    ))}
                  </Select>
                </div>
              ))
            )}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Input
                placeholder="Add custom field name"
                value={customField}
                onChange={e => setCustomField(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={addCustomField}>Add Field</Button>
            </div>
          </CardContent>
        </Card>

        {sampleItem && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="h-4 w-4 mr-1" />{showPreview ? "Hide" : "Show"} Preview
                </Button>
              </div>
            </CardHeader>
            {showPreview && preview && (
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <p className="font-semibold text-lg text-[#1A1A2E]">{preview.title || "(no title mapped)"}</p>
                  <p className="text-sm text-gray-600">{preview.company || "(no company)"} &mdash; {preview.location || "(no location)"}</p>
                  {preview.sector && <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">{preview.sector}</span>}
                  {(preview.salaryMin || preview.salaryMax) && (
                    <p className="text-sm text-gray-500">Salary: {preview.salaryMin || "?"} - {preview.salaryMax || "?"}</p>
                  )}
                  {preview.description && <p className="text-sm text-gray-500 line-clamp-3">{preview.description}</p>}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Mappings
          </Button>
          <Button variant="outline" onClick={() => router.push("/admin/scraper")}>Cancel</Button>
        </div>
      </div>
    </>
  )
}
