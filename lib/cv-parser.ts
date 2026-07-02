/* eslint-disable @typescript-eslint/no-explicit-any */
import mammoth from "mammoth"

async function parsePdfBuffer(fileBuffer: Buffer): Promise<string> {
  const PDFParser = (await import("pdf2json")).default
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parser.on("pdfParser_dataReady", (pdfData: any) => {
      const pages = pdfData?.Pages || []
      const text = pages
        .map((page: any) => {
          const items = (page.Texts || []).map((t: any) => ({
            x: t.x || 0,
            y: t.y || 0,
            text: (t.R || []).map((r: any) => decodeURIComponent(r.T || "")).join(""),
          }))
          items.sort((a: any, b: any) => a.y - b.y || a.x - b.x)
          const lines: string[] = []
          let lastY = -1
          for (const item of items) {
            if (lastY >= 0 && Math.abs(item.y - lastY) > 0.3) {
              lines.push("\n")
            }
            lines.push(item.text)
            lastY = item.y
          }
          return lines.join(" ").replace(/ \n /g, "\n").replace(/ +/g, " ")
        })
        .join("\n\n")
      resolve(text)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parser.on("pdfParser_dataError", (err: any) => {
      reject(new Error(String(err?.parserError || "PDF parse failed")))
    })
    parser.parseBuffer(fileBuffer)
  })
}

export interface ParsedExperience {
  title: string
  company: string
  startDate?: string
  endDate?: string
  current: boolean
  description?: string
}

export interface ParsedEducation {
  degree: string
  institution: string
  field?: string
  startDate?: string
  endDate?: string
  current: boolean
}

export interface ParsedCertificate {
  name: string
  issuer?: string
  issueDate?: string
}

export interface ParsedCV {
  rawText: string
  name: string
  email: string
  phone: string
  location: string
  skills: string[]
  experience: ParsedExperience[]
  education: ParsedEducation[]
  certificates: ParsedCertificate[]
}

type SectionKey = "preamble" | "summary" | "experience" | "education" | "skills" | "certificates" | "references"

const SECTION_HEADER_PATTERNS: Array<{ key: SectionKey; pattern: RegExp }> = [
  { key: "summary", pattern: /^(personal\s+)?(profile|summary|objective|about\s*me|career\s+objective|professional\s+summary)$/i },
  { key: "experience", pattern: /^(work\s+|professional\s+|career\s+|employment\s+)?(experience|history|employment\s+history|work\s+history)$/i },
  { key: "education", pattern: /^(education(al)?\s*(background|history)?|academic\s+(background|qualifications)|qualifications)$/i },
  { key: "skills", pattern: /^(key\s+|core\s+|technical\s+)?(skills|competencies|areas\s+of\s+expertise)$/i },
  { key: "certificates", pattern: /^(certificat(es|ions)|licen[cs]es|accreditations|professional\s+development|training(\s+(&|and)\s+certifications)?)$/i },
  { key: "references", pattern: /^references?$/i },
]

function splitIntoSections(allLines: string[]): Record<SectionKey, string[]> {
  const sections: Record<SectionKey, string[]> = {
    preamble: [], summary: [], experience: [], education: [], skills: [], certificates: [], references: [],
  }
  let current: SectionKey = "preamble"
  for (const line of allLines) {
    const header = line.length < 40 ? SECTION_HEADER_PATTERNS.find(({ pattern }) => pattern.test(line.replace(/[:.]+$/, "").trim())) : undefined
    if (header) {
      current = header.key
      continue
    }
    sections[current].push(line)
  }
  return sections
}

const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
const DATE_TOKEN = `(?:${MONTHS})\\s+\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4}`
const DATE_RANGE_RE = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|to|until)\\s*(${DATE_TOKEN}|present|current|now)`, "i")

function parseMonthYear(str: string): Date | null {
  const s = str.trim()
  const monthYear = s.match(new RegExp(`(${MONTHS})\\s+(\\d{4})`, "i"))
  if (monthYear) {
    const monthIdx = MONTH_NAMES.findIndex((m) => monthYear[1].toLowerCase().startsWith(m))
    return new Date(parseInt(monthYear[2]), monthIdx >= 0 ? monthIdx : 0, 1)
  }
  const slash = s.match(/(\d{1,2})\/(\d{4})/)
  if (slash) return new Date(parseInt(slash[2]), parseInt(slash[1]) - 1, 1)
  const yearOnly = s.match(/^\d{4}$/)
  if (yearOnly) return new Date(parseInt(s), 0, 1)
  return null
}

function extractDateRange(line: string): { startDate?: string; endDate?: string; current: boolean } | null {
  const m = line.match(DATE_RANGE_RE)
  if (!m) return null
  const start = parseMonthYear(m[1])
  const isCurrent = /present|current|now/i.test(m[2])
  const end = isCurrent ? null : parseMonthYear(m[2])
  return {
    startDate: start ? start.toISOString() : undefined,
    endDate: end ? end.toISOString() : undefined,
    current: isCurrent,
  }
}

function extractEmail(text: string): string {
  const match = text.match(/[\w.-]+@[\w.-]+\.\w+/)
  return match ? match[0] : ""
}

function extractPhone(text: string): string {
  const match = text.match(/(\+44|0)[\s\d\-()]{9,14}/)
  return match ? match[0].trim() : ""
}

function extractName(preambleLines: string[], allLines: string[]): string {
  const candidates = preambleLines.length > 0 ? preambleLines : allLines.slice(0, 10)

  const labelled = candidates.find((l) => /^name\s*[:\-]/i.test(l))
  if (labelled) {
    const value = labelled.replace(/^name\s*[:\-]\s*/i, "").trim()
    if (value) return value
  }

  for (const line of candidates.slice(0, 10)) {
    const cleaned = line.replace(/[^a-zA-Z\s'-]/g, "").trim()
    const words = cleaned.split(/\s+/).filter(Boolean)
    if (
      words.length >= 2 &&
      words.length <= 4 &&
      words.every((w) => w.length > 1) &&
      cleaned.length < 40 &&
      !/\b(education|experience|work|email|phone|address|summary|objective|skills|university|qualifications|profile|personal|curriculum|vitae|resume|statement|cv)\b/i.test(cleaned)
    ) {
      const isAllCaps = cleaned === cleaned.toUpperCase() && cleaned !== cleaned.toLowerCase()
      const isTitleCase = !isAllCaps && words.every((w) => /^[A-Z][a-z'-]*$/.test(w))
      if (isTitleCase) return cleaned
      if (isAllCaps) return words.map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")
    }
  }
  return candidates[0]?.substring(0, 60) || ""
}

const UK_CITIES = [
  "london", "manchester", "birmingham", "leeds", "glasgow", "liverpool",
  "bristol", "sheffield", "edinburgh", "leicester", "coventry", "nottingham",
  "bradford", "cardiff", "belfast", "derby", "plymouth", "wolverhampton",
  "southampton", "reading", "oxford", "cambridge", "york", "brighton",
  "milton keynes", "luton", "swansea", "aberdeen", "dundee", "newcastle",
  "sunderland", "portsmouth", "norwich", "exeter", "bath", "stoke-on-trent",
]

const UK_POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i

function extractLocation(text: string, preambleLines: string[]): string {
  const labelled = preambleLines.find((l) => /^(location|address)\s*[:\-]/i.test(l))
  if (labelled) {
    const value = labelled.replace(/^(location|address)\s*[:\-]\s*/i, "").trim()
    if (value) return value
  }

  const lowerText = text.toLowerCase()
  const found = UK_CITIES.find((city) => lowerText.includes(city))
  if (found) return found.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")

  const postcode = text.match(UK_POSTCODE_RE)
  return postcode ? postcode[0].toUpperCase() : ""
}

const SKILL_VOCAB = [
  "javascript", "typescript", "react", "react native", "next.js", "vue", "angular", "node",
  "python", "java", "c#", ".net", "php", "ruby", "swift", "kotlin", "flutter", "sql",
  "html", "css", "sass", "tailwind", "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
  "ci/cd", "git", "github", "gitlab", "jira", "confluence", "linux", "mongodb", "postgresql",
  "mysql", "redis", "graphql", "rest api", "figma", "photoshop", "illustrator", "adobe xd",
  "excel", "powerpoint", "power bi", "tableau", "salesforce", "sap", "project management",
  "agile", "scrum", "prince2", "patient care", "clinical", "nursing", "medication", "healthcare",
  "nhs", "care plan", "first aid", "safeguarding", "site management", "health and safety", "cad",
  "building regulations", "cscs", "smsts", "sssts", "communication", "leadership", "teamwork",
  "problem solving", "customer service", "sales", "marketing", "seo", "data analysis", "data analytics",
]

function extractSkillsFromSection(sectionLines: string[]): string[] {
  if (sectionLines.length === 0) return []
  const tokens = sectionLines
    .join(", ")
    .split(/[,•|·;]/)
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean)
  return tokens.filter((t) => t.length >= 2 && t.length <= 30 && !/^\d+$/.test(t))
}

function extractSkills(text: string, skillsSectionLines: string[]): string[] {
  const lowerText = text.toLowerCase()
  const sectionTokens = extractSkillsFromSection(skillsSectionLines)
  const sectionKeys = sectionTokens.map((t) => t.toLowerCase())

  const merged = new Map<string, string>()
  for (const skill of SKILL_VOCAB) {
    if (!lowerText.includes(skill)) continue
    const coveredBySection = sectionKeys.some((k) => k.includes(skill) || skill.includes(k))
    if (coveredBySection) continue
    merged.set(skill, skill)
  }
  for (const token of sectionTokens) {
    merged.set(token.toLowerCase(), token)
  }
  return Array.from(merged.values()).slice(0, 30)
}

const TITLE_KEYWORDS = /\b(manager|developer|engineer|analyst|coordinator|director|officer|specialist|consultant|assistant|advisor|administrator|supervisor|technician|nurse|teacher|lead|head|executive|representative|associate|intern|apprentice|trainee|designer|architect|planner|operative|practitioner|support worker|care worker)\b/i

function pickTitleAndCompany(beforeLines: string[], dateLine: string): { title: string; company: string } {
  const stripped = dateLine.replace(DATE_RANGE_RE, "").replace(/^[\s|·•,\-–—]+|[\s|·•,\-–—]+$/g, "").trim()
  if (stripped.length > 3) {
    const m = stripped.match(/^(.+?)\s+at\s+(.+)$/i) || stripped.match(/^(.+?)\s*[—–\-,|·]\s*(.+)$/)
    if (m && m[1] && m[2] && m[1].length < 80 && m[2].length < 80) {
      return { title: m[1].trim(), company: m[2].trim() }
    }
  }

  const candidates = beforeLines.filter((l) => l.length > 0 && l.length < 100)

  for (const line of candidates) {
    const m = line.match(/^(.+?)\s+at\s+(.+)$/i) || line.match(/^(.+?)\s*[—–\-,]\s*(.+)$/)
    if (m && m[1] && m[2] && m[1].length < 80 && m[2].length < 80) {
      return { title: m[1].trim(), company: m[2].trim() }
    }
  }

  for (let i = 0; i < candidates.length; i++) {
    if (TITLE_KEYWORDS.test(candidates[i])) {
      return { title: candidates[i], company: candidates[i + 1] || candidates[i - 1] || "" }
    }
  }

  return { title: candidates[candidates.length - 1] || "", company: candidates[candidates.length - 2] || "" }
}

function extractExperience(sectionLines: string[], fallbackLines: string[]): ParsedExperience[] {
  const lines = sectionLines.length > 0 ? sectionLines : fallbackLines
  if (lines.length === 0) return []

  const anchors: number[] = []
  lines.forEach((line, i) => { if (DATE_RANGE_RE.test(line)) anchors.push(i) })

  const experiences: ParsedExperience[] = []

  if (anchors.length > 0) {
    const LOOKBACK = 2
    for (let a = 0; a < anchors.length; a++) {
      const anchorIdx = anchors[a]
      const beforeStart = a === 0
        ? Math.max(0, anchorIdx - LOOKBACK)
        : Math.max(anchors[a - 1] + 1, anchorIdx - LOOKBACK)
      const beforeLines = lines.slice(beforeStart, anchorIdx)
      const dateInfo = extractDateRange(lines[anchorIdx])
      const { title, company } = pickTitleAndCompany(beforeLines, lines[anchorIdx])
      if (!title) continue

      const descStart = anchorIdx + 1
      const descEnd = a === anchors.length - 1
        ? Math.min(lines.length, anchorIdx + 8)
        : Math.max(descStart, anchors[a + 1] - 1)
      const description = lines.slice(descStart, descEnd).join(" ").substring(0, 500)

      experiences.push({
        title,
        company: company || "",
        startDate: dateInfo?.startDate,
        endDate: dateInfo?.endDate,
        current: dateInfo?.current || false,
        description: description || undefined,
      })
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      if (TITLE_KEYWORDS.test(lines[i])) {
        experiences.push({ title: lines[i], company: lines[i + 1] || "", current: false })
      }
    }
  }

  return experiences.slice(0, 8)
}

const DEGREE_KEYWORDS = /\b(bachelor|master|phd|doctorate|diploma|certificate|btec|nvq|gcse|a-level|foundation degree|bsc|ba|msc|ma|mba|hnd|hnc)\b/i
const DEGREE_FIELD_RE = /\b(?:bachelor|master|bsc|ba|msc|ma|hnd|hnc)\w*\s*(?:of|in)?\s*(.+)/i

function extractEducation(sectionLines: string[], fallbackLines: string[]): ParsedEducation[] {
  const lines = sectionLines.length > 0 ? sectionLines : fallbackLines
  if (lines.length === 0) return []

  const educations: ParsedEducation[] = []
  const seen = new Set<number>()

  for (let idx = 0; idx < lines.length; idx++) {
    if (seen.has(idx)) continue
    const line = lines[idx]
    const hasDegree = DEGREE_KEYWORDS.test(line)
    if (!hasDegree && !DATE_RANGE_RE.test(line)) continue

    let dateInfo = extractDateRange(line)
    let degree = ""
    let institution = ""
    let field: string | undefined

    if (hasDegree) {
      seen.add(idx)
      const split = line.match(/^(.+?)\s*[,\-–]\s*(.+)$/)
      if (split) {
        degree = split[1].trim()
        institution = split[2].trim()
      } else {
        degree = line
      }

      let next = lines[idx + 1] || ""
      if (DATE_RANGE_RE.test(next)) {
        dateInfo = dateInfo || extractDateRange(next)
        seen.add(idx + 1)
        next = lines[idx + 2] || ""
        if (!institution) institution = next
        if (next && DATE_RANGE_RE.test(next)) seen.add(idx + 2)
      } else if (!institution && next) {
        institution = next
        seen.add(idx + 1)
        const after = lines[idx + 2] || ""
        if (DATE_RANGE_RE.test(after)) { dateInfo = dateInfo || extractDateRange(after); seen.add(idx + 2) }
      }

      const fieldMatch = degree.match(DEGREE_FIELD_RE)
      if (fieldMatch && fieldMatch[1]) field = fieldMatch[1].trim()
    } else {
      seen.add(idx)
      institution = lines[idx - 1] || lines[idx + 1] || ""
      degree = "Qualification"
    }

    if (institution || degree) {
      educations.push({
        degree: degree || "Qualification",
        institution,
        field,
        startDate: dateInfo?.startDate,
        endDate: dateInfo?.endDate,
        current: dateInfo?.current || false,
      })
    }
  }

  return educations.slice(0, 5)
}

const CERT_KEYWORDS = /\b(certified|certification|certificate|accredited|award|licence|license|first aid|safeguarding|dbs|cscs|smsts|sssts|cpd|ecdl|iosh|nebosh|prince2|itil|comptia|pmp|cisco)\b/i

function extractCertificates(sectionLines: string[], fallbackLines: string[]): ParsedCertificate[] {
  const lines = sectionLines.length > 0 ? sectionLines : fallbackLines
  const certs: ParsedCertificate[] = []

  for (let i = 0; i < lines.length; i++) {
    if (!CERT_KEYWORDS.test(lines[i])) continue
    const name = lines[i]
    const nextLine = lines[i + 1] || ""
    const yearMatch = name.match(/\b(19|20)\d{2}\b/) || nextLine.match(/\b(19|20)\d{2}\b/)
    const issuer = TITLE_KEYWORDS.test(nextLine) || DATE_RANGE_RE.test(nextLine) || CERT_KEYWORDS.test(nextLine) ? "" : nextLine

    certs.push({
      name,
      issuer: issuer || undefined,
      issueDate: yearMatch ? new Date(parseInt(yearMatch[0]), 0, 1).toISOString() : undefined,
    })
  }

  return certs.slice(0, 8)
}

export async function parseCV(fileBuffer: Buffer, mimeType: string): Promise<ParsedCV> {
  let text = ""

  if (mimeType === "application/pdf") {
    try {
      text = await parsePdfBuffer(fileBuffer)
    } catch (pdfError) {
      console.error("PDF parse error:", pdfError)
      text = ""
    }
  } else if (
    mimeType.includes("word") ||
    mimeType.includes("docx") ||
    mimeType.includes("doc")
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer })
      text = result.value || ""
    } catch (docError) {
      console.error("DOCX parse error:", docError)
      text = ""
    }
  }

  if (!text.trim()) {
    throw new Error("Could not extract text from file. The file may be scanned/image-based or corrupted.")
  }

  const allLines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const sections = splitIntoSections(allLines)

  return {
    rawText: text,
    name: extractName(sections.preamble, allLines),
    email: extractEmail(text),
    phone: extractPhone(text),
    location: extractLocation(text, sections.preamble),
    skills: extractSkills(text, sections.skills),
    experience: extractExperience(sections.experience, allLines),
    education: extractEducation(sections.education, allLines),
    certificates: extractCertificates(sections.certificates, allLines),
  }
}
