"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import DOMPurify from "dompurify"
import { ChevronDown, ChevronUp } from "lucide-react"

function fixMojibake(text: string): string {
  return text
    .replace(/\xC3\xA2\xC2\x80\xC2\x99/g, "'")
    .replace(/\xC3\xA2\xC2\x80\xC2\x9C/g, "“")
    .replace(/\xC3\xA2\xC2\x80\xC2\x9D/g, "”")
    .replace(/\xC3\xA2\xC2\x80\xC2\x93/g, "–")
    .replace(/\xC3\xA2\xC2\x80\xC2\x94/g, "—")
    .replace(/\xC3\xA2\xC2\x80\xC2\xA6/g, "…")
    .replace(/\xC3\xA2\xC2\x80\xC2\x98/g, "‘")
    .replace(/â/g, "'")
    .replace(/â/g, "“")
    .replace(/â/g, "”")
    .replace(/â/g, "–")
    .replace(/â/g, "—")
    .replace(/â¦/g, "…")
    .replace(/â/g, "‘")
    .replace(/â/g, "")
    .replace(/â€™/g, "'").replace(/â€œ/g, "“").replace(/â€/g, "”")
    .replace(/â€"/g, "–").replace(/â€"/g, "—").replace(/â€¦/g, "…")
    .replace(/â€˜/g, "‘").replace(/â€‹/g, "")
    .replace(/Ã©/g, "é").replace(/Ã³/g, "ó").replace(/Ã¡/g, "á")
    .replace(/Ã±/g, "ñ").replace(/Ã¼/g, "ü")
}

function decodeHtmlEntities(text: string): string {
  if (typeof window === "undefined") return text
  const txt = document.createElement("textarea")
  txt.innerHTML = text
  return txt.value
}

interface HtmlContentProps {
  html: string
  className?: string
  collapsible?: boolean
  maxHeight?: number
}

export function HtmlContent({ html, className, collapsible = false, maxHeight = 300 }: HtmlContentProps) {
  const [expanded, setExpanded] = useState(false)
  const [needsCollapse, setNeedsCollapse] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const clean = useMemo(() => {
    if (typeof window === "undefined") return ""
    const fixed = fixMojibake(html)
    const decoded = decodeHtmlEntities(fixed)
    return DOMPurify.sanitize(decoded, {
      ALLOWED_TAGS: ["h1","h2","h3","h4","h5","h6","p","br","ul","ol","li","strong","b","em","i","a","span","div","table","thead","tbody","tr","th","td","hr","blockquote","pre","code","sup","sub"],
      ALLOWED_ATTR: ["href","target","rel","style","class"],
    })
  }, [html])

  useEffect(() => {
    if (collapsible && contentRef.current) {
      setNeedsCollapse(contentRef.current.scrollHeight > maxHeight)
    }
  }, [clean, collapsible, maxHeight])

  if (!clean) return null

  if (!collapsible) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    )
  }

  return (
    <div>
      <div
        ref={contentRef}
        className={`${className} overflow-hidden transition-all duration-300`}
        style={needsCollapse && !expanded ? { maxHeight } : undefined}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
      {needsCollapse && !expanded && (
        <div className="h-16 -mt-16 relative bg-gradient-to-t from-white to-transparent pointer-events-none" />
      )}
      {needsCollapse && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-sm font-medium text-[#5B4FE8] hover:text-[#4a3fd0] transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-4 w-4" /> Read less</>
          ) : (
            <><ChevronDown className="h-4 w-4" /> Read more</>
          )}
        </button>
      )}
    </div>
  )
}
