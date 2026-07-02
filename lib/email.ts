import { Resend } from "resend"

interface EmailPayload {
  to: string
  subject: string
  html: string
}

const FROM = process.env.EMAIL_FROM || "EdvanceFE <noreply@edvancefe.com>"

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email send")
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<boolean> {
  const resend = getClient()
  if (!resend) return false

  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html })
    if (error) {
      console.error("Resend send error:", error)
      return false
    }
    return true
  } catch (err) {
    console.error("Resend send exception:", err)
    return false
  }
}

export async function sendBatchEmails(items: EmailPayload[]): Promise<{ sent: number; failed: number }> {
  const resend = getClient()
  if (!resend || items.length === 0) {
    return { sent: 0, failed: items.length }
  }

  let sent = 0
  let failed = 0
  const CHUNK_SIZE = 100

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE)
    try {
      const { data, error } = await resend.batch.send(
        chunk.map((item) => ({ from: FROM, to: item.to, subject: item.subject, html: item.html }))
      )
      if (error) {
        console.error("Resend batch send error:", error)
        failed += chunk.length
        continue
      }
      sent += data?.data?.length ?? chunk.length
    } catch (err) {
      console.error("Resend batch send exception:", err)
      failed += chunk.length
    }
  }

  return { sent, failed }
}
