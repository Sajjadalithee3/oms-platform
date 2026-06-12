interface ReedJob {
  jobTitle: string
  employerName: string
  locationName: string
  minimumSalary: number | null
  maximumSalary: number | null
  jobDescription: string
  jobUrl: string
  jobId: number
  expirationDate: string | null
}

function normaliseReedJob(job: ReedJob) {
  return {
    title: job.jobTitle,
    company: job.employerName,
    location: job.locationName,
    salaryMin: job.minimumSalary,
    salaryMax: job.maximumSalary,
    description: job.jobDescription || "",
    sourceUrl: job.jobUrl,
    externalId: String(job.jobId),
    sourceType: "REED",
    deadline: job.expirationDate ? new Date(job.expirationDate) : null,
  }
}

export async function fetchFromReed(apiKey: string, keywords: string, location: string = "uk") {
  const url = `https://www.reed.co.uk/api/1.0/search?keywords=${encodeURIComponent(keywords)}&location=${location}&resultsToTake=100`
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}` },
  })
  if (!response.ok) throw new Error(`Reed API error: ${response.status}`)
  const data = await response.json()
  return (data.results || []).map(normaliseReedJob)
}
