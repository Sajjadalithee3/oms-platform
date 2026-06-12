// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse")
import mammoth from "mammoth"

export interface ParsedCV {
  rawText: string
  name: string
  email: string
  phone: string
  location: string
  skills: string[]
  experience: Array<{ title: string; company: string }>
  education: Array<{ degree: string; institution: string }>
}

export async function parseCV(fileBuffer: Buffer, mimeType: string): Promise<ParsedCV> {
  let text = ""

  if (mimeType === "application/pdf") {
    const data = await pdfParse(fileBuffer)
    text = data.text
  } else if (
    mimeType.includes("word") ||
    mimeType.includes("docx") ||
    mimeType.includes("doc")
  ) {
    const result = await mammoth.extractRawText({ buffer: fileBuffer })
    text = result.value
  }

  return {
    rawText: text,
    name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    location: extractLocation(text),
    skills: extractSkills(text),
    experience: extractExperience(text),
    education: extractEducation(text),
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

function extractName(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  return lines[0] || ""
}

function extractSkills(text: string): string[] {
  const skillsKeywords = [
    "javascript", "typescript", "react", "node", "python", "java", "sql",
    "html", "css", "aws", "azure", "docker", "kubernetes", "git", "mongodb",
    "postgresql", "mysql",
    "patient care", "clinical", "nursing", "medication", "healthcare", "nhs",
    "care plan",
    "project management", "agile", "scrum", "excel", "powerpoint", "sales",
    "marketing", "customer service", "communication", "leadership", "teamwork",
    "problem solving",
    "site management", "health and safety", "cad", "building regulations",
  ]
  const lowerText = text.toLowerCase()
  return skillsKeywords.filter((skill) => lowerText.includes(skill))
}

function extractLocation(text: string): string {
  const ukCities = [
    "london", "manchester", "birmingham", "leeds", "glasgow", "liverpool",
    "bristol", "sheffield", "edinburgh", "leicester", "coventry", "nottingham",
    "bradford", "cardiff", "belfast", "derby", "plymouth", "wolverhampton",
    "southampton",
  ]
  const lowerText = text.toLowerCase()
  const found = ukCities.find((city) => lowerText.includes(city))
  return found ? found.charAt(0).toUpperCase() + found.slice(1) : ""
}

function extractExperience(text: string): Array<{ title: string; company: string }> {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  const experiences: Array<{ title: string; company: string }> = []
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].match(
        /\b(manager|developer|engineer|analyst|coordinator|director|officer|specialist|consultant|assistant|advisor)\b/i
      )
    ) {
      experiences.push({ title: lines[i], company: lines[i + 1] || "" })
    }
  }
  return experiences.slice(0, 5)
}

function extractEducation(text: string): Array<{ degree: string; institution: string }> {
  const educations: Array<{ degree: string; institution: string }> = []
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].match(
        /\b(degree|bachelor|master|phd|diploma|certificate|btec|nvq|gcse|a-level)\b/i
      )
    ) {
      educations.push({ degree: lines[i], institution: lines[i + 1] || "" })
    }
  }
  return educations.slice(0, 3)
}
