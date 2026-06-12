interface AdzunaJob {
  title: string
  company: { display_name: string } | null
  location: { display_name: string } | null
  salary_min: number | null
  salary_max: number | null
  description: string
  redirect_url: string
  id: string
}

function normaliseAdzunaJob(job: AdzunaJob) {
  return {
    title: job.title,
    company: job.company?.display_name || "",
    location: job.location?.display_name || "",
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    description: job.description || "",
    sourceUrl: job.redirect_url,
    externalId: String(job.id),
    sourceType: "ADZUNA",
    deadline: null,
  }
}

export async function fetchFromAdzuna(appId: string, appKey: string, what: string = "", where: string = "uk") {
  const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=100&what=${encodeURIComponent(what)}&where=${encodeURIComponent(where)}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Adzuna API error: ${response.status}`)
  const data = await response.json()
  return (data.results || []).map(normaliseAdzunaJob)
}
