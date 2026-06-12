export async function fetchFromGenericUrl(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; EdvanceFE/1.0)" },
  })
  if (!response.ok) throw new Error(`Generic fetch error: ${response.status}`)
  const html = await response.text()
  return { html, url, fetchedAt: new Date() }
}
