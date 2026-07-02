interface EmailTemplate {
  subject: string
  html: string
}

function wrapper(bodyHtml: string): string {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1A1A2E;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: 700; color: #5B4FE8;">EdvanceFE</span>
    </div>
    ${bodyHtml}
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; text-align: center;">
      EdvanceFE &middot; This is an automated message, please don't reply directly.
    </div>
  </div>`
}

function ctaButton(label: string, url: string): string {
  return `<a href="${url}" style="display: inline-block; background: #5B4FE8; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">${label}</a>`
}

export function credentialsEmailTemplate({
  name,
  email,
  password,
  loginUrl,
}: {
  name: string
  email: string
  password: string
  loginUrl: string
}): EmailTemplate {
  return {
    subject: "Your EdvanceFE account is ready",
    html: wrapper(`
      <p>Hi ${name},</p>
      <p>An account has been created for you on EdvanceFE. Here are your login details:</p>
      <div style="background: #F8F9FA; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 4px 0;"><strong>Temporary password:</strong> ${password}</p>
      </div>
      <p>Log in and complete your profile to 100% &mdash; the more complete your profile, the better we can match you with relevant jobs.</p>
      <div style="margin: 24px 0;">${ctaButton("Log in to EdvanceFE", loginUrl)}</div>
      <p style="font-size: 13px; color: #6B7280;">You'll be asked if you'd like to set a new password the first time you log in.</p>
    `),
  }
}

export function nudgeEmailTemplate({
  name,
  loginUrl,
}: {
  name: string
  loginUrl: string
}): EmailTemplate {
  return {
    subject: "Don't miss out on job matches — complete your profile",
    html: wrapper(`
      <p>Hi ${name},</p>
      <p>We noticed you haven't logged in to EdvanceFE yet, or your profile still isn't complete. Finishing your profile helps us match you with jobs that fit your skills.</p>
      <div style="margin: 24px 0;">${ctaButton("Log in and complete your profile", loginUrl)}</div>
      <p style="font-size: 13px; color: #6B7280;">It only takes a few minutes, and better matches are waiting.</p>
    `),
  }
}

export function bulkNotificationEmailTemplate({
  name,
  title,
  body,
  link,
}: {
  name: string
  title: string
  body: string
  link?: string | null
}): EmailTemplate {
  return {
    subject: title,
    html: wrapper(`
      <p>Hi ${name},</p>
      <p style="font-weight: 600; font-size: 16px;">${title}</p>
      <p>${body}</p>
      ${link ? `<div style="margin: 24px 0;">${ctaButton("View details", link)}</div>` : ""}
    `),
  }
}
