"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

interface Ad {
  id: string
  type: string
  imageUrl: string | null
  text: string | null
  externalLink: string | null
}

export function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/ads/active").then((r) => (r.ok ? r.json() : [])).then(setAds).catch(() => {})
  }, [])

  const bar = ads.find((a) => a.type === "ANNOUNCEMENT_BAR" && !dismissed.has(a.id))
  const banner = ads.find((a) => a.type === "BANNER_IMAGE" && !dismissed.has(a.id))

  if (!bar && !banner) return null

  return (
    <div className="space-y-3 mb-4">
      {bar && (
        <div className="flex items-center justify-between bg-[#5B4FE8] text-white text-sm px-4 py-2 rounded-md">
          {bar.externalLink ? (
            <a href={bar.externalLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {bar.text}
            </a>
          ) : (
            <span>{bar.text}</span>
          )}
          <button onClick={() => setDismissed((prev) => new Set(prev).add(bar.id))} className="ml-3 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {banner && banner.imageUrl && (
        <div className="relative rounded-md overflow-hidden border">
          <button
            onClick={() => setDismissed((prev) => new Set(prev).add(banner.id))}
            className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 z-10"
          >
            <X className="h-4 w-4" />
          </button>
          {banner.externalLink ? (
            <a href={banner.externalLink} target="_blank" rel="noopener noreferrer">
              <img src={banner.imageUrl} alt="Advertisement" className="w-full max-h-48 object-cover" />
            </a>
          ) : (
            <img src={banner.imageUrl} alt="Advertisement" className="w-full max-h-48 object-cover" />
          )}
        </div>
      )}
    </div>
  )
}
