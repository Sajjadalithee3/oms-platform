"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X, Loader2, Check } from "lucide-react"
import type { ParsedCV } from "@/lib/cv-parser"

interface CVUploadProps {
  onParsed?: (data: ParsedCV, fileName: string) => void
  onSave?: (data: ParsedCV, fileName: string) => void
  bulk?: boolean
  providerId?: string
  cohortId?: string
}

interface UploadResult {
  fileName: string
  fileSize: number
  parsed: ParsedCV | null
  error: string | null
}

export function CVUpload({ onParsed, onSave, bulk = false, providerId, cohortId }: CVUploadProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<UploadResult[]>([])

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true)
      const fileArray = Array.from(files)

      if (bulk) {
        const formData = new FormData()
        fileArray.forEach((f) => formData.append("cvs", f))
        if (providerId) formData.append("providerId", providerId)
        if (cohortId) formData.append("cohortId", cohortId)

        try {
          const res = await fetch("/api/upload/cv-bulk", {
            method: "POST",
            body: formData,
          })
          const data = await res.json()
          setResults(data.results || [])
        } catch {
          setResults(
            fileArray.map((f) => ({
              fileName: f.name,
              fileSize: f.size,
              parsed: null,
              error: "Upload failed",
            }))
          )
        }
      } else {
        const file = fileArray[0]
        if (!file) return
        const formData = new FormData()
        formData.append("cv", file)

        try {
          const res = await fetch("/api/upload/cv", {
            method: "POST",
            body: formData,
          })
          const data = await res.json()
          if (data.error) {
            setResults([{ fileName: file.name, fileSize: file.size, parsed: null, error: data.error }])
          } else {
            setResults([{ fileName: data.fileName, fileSize: data.fileSize, parsed: data.parsed, error: null }])
            onParsed?.(data.parsed, data.fileName)
          }
        } catch {
          setResults([{ fileName: file.name, fileSize: file.size, parsed: null, error: "Upload failed" }])
        }
      }

      setUploading(false)
    },
    [bulk, providerId, cohortId, onParsed]
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) handleFiles(e.target.files)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-gray-600">Parsing CV...</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Drag & drop {bulk ? "files" : "a file"} here, or click to browse
            </p>
            <p className="text-xs text-gray-400">PDF, DOC, DOCX (max 5MB)</p>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple={bulk}
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{result.fileName}</span>
                  {result.fileSize && (
                    <span className="text-xs text-gray-400">
                      ({(result.fileSize / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setResults(results.filter((_, j) => j !== i))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {result.error && (
                <p className="text-sm text-red-600">{result.error}</p>
              )}

              {result.parsed && (
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Name:</span>{" "}
                      {result.parsed.name || "—"}
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>{" "}
                      {result.parsed.email || "—"}
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>{" "}
                      {result.parsed.phone || "—"}
                    </div>
                    <div>
                      <span className="text-gray-500">Location:</span>{" "}
                      {result.parsed.location || "—"}
                    </div>
                  </div>
                  {result.parsed.skills.length > 0 && (
                    <div>
                      <span className="text-gray-500">Skills:</span>{" "}
                      <span className="flex flex-wrap gap-1 mt-1">
                        {result.parsed.skills.map((s) => (
                          <span
                            key={s}
                            className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                  {onSave && (
                    <Button
                      size="sm"
                      onClick={() => onSave(result.parsed!, result.fileName)}
                      className="mt-2"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Save to Profile
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
