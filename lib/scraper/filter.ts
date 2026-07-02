const DUMMY_SIGNALS = [
  /\btest\s+job\b/i,
  /\bdummy\b/i,
  /\bplaceholder\b/i,
  /\bsample\s+(position|job|listing)\b/i,
  /\blorem\s+ipsum\b/i,
  /\bfake\s+(job|listing|position)\b/i,
  /\bdo\s+not\s+apply\b/i,
  /\bexample\s+(job|listing|position)\b/i,
  /\btest123\b/i,
  /\basdf\b/i,
  /\bxxx+\b/i,
]

const MIN_TITLE_LENGTH = 5
const MIN_DESCRIPTION_LENGTH = 50

export function isDummyJob(job: Record<string, unknown>): boolean {
  const title = String(job.title || "").trim()
  const description = String(job.description || "").trim()
  const company = String(job.company || "").trim()

  if (title.length < MIN_TITLE_LENGTH) return true
  if (description.length < MIN_DESCRIPTION_LENGTH) return true
  if (!company || company === "Unknown" || company.length < 2) return true

  const text = `${title} ${description} ${company}`
  for (const pattern of DUMMY_SIGNALS) {
    if (pattern.test(text)) return true
  }

  if (/^[A-Z\s]+$/.test(title) && title.length > 30) return true
  if (title === company) return true

  const repeatCheck = title.toLowerCase()
  if (/(.)\1{4,}/.test(repeatCheck)) return true

  return false
}

export function matchesLocationFilter(job: Record<string, unknown>, filterLocation: string): boolean {
  if (!filterLocation) return true
  const filters = filterLocation.toLowerCase().split(",").map(s => s.trim()).filter(Boolean)
  if (filters.length === 0) return true

  const jobLocation = String(job.location || "").toLowerCase()
  const jobCity = String(job.city || "").toLowerCase()
  const jobRegion = String(job.region || "").toLowerCase()
  const jobCountry = String(job.country || "").toLowerCase()
  const combined = `${jobLocation} ${jobCity} ${jobRegion} ${jobCountry}`

  return filters.some(f => combined.includes(f))
}

export function matchesCategoryFilter(job: Record<string, unknown>, filterCategory: string): boolean {
  if (!filterCategory) return true
  const filters = filterCategory.toLowerCase().split(",").map(s => s.trim()).filter(Boolean)
  if (filters.length === 0) return true

  const jobCategory = String(job.category || "").toLowerCase()
  const jobSector = String(job.sector || "").toLowerCase()
  const jobTitle = String(job.title || "").toLowerCase()
  const combined = `${jobCategory} ${jobSector} ${jobTitle}`

  return filters.some(f => combined.includes(f))
}
