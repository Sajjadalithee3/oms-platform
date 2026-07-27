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
      <br />Powered by SkillsConnected
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
  providerName,
  courseName,
}: {
  name: string
  email: string
  password: string
  loginUrl: string
  providerName?: string | null
  courseName?: string | null
}): EmailTemplate {
  return {
    subject: "Congratulations! Your free EdvanceFE job matching account is ready",
    html: wrapper(`
      <p>Hi ${name},</p>
      <p style="font-size: 17px; font-weight: 700; color: #5B4FE8;">Congratulations and welcome! 🎉</p>
      <p>We've added you to EdvanceFE${providerName ? `, by <strong>${providerName}</strong>,` : ""} our free job matching platform brought to you by SkillsConnected.</p>
      <p>${courseName ? `Since you're training in <strong>${courseName}</strong>, you'll` : "You'll"} now start receiving daily job matches picked just for you, so you never miss a great opportunity that fits the course you're doing with us.</p>
      <div style="background: #F8F9FA; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 4px 0;"><strong>Temporary password:</strong> ${password}</p>
      </div>
      <p>Log in below and complete your profile so we can match you with the best jobs out there, the more we know about you, the better your matches will be.</p>
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

export function welcomeEmailTemplate({
  name,
  roleLabel,
  loginUrl,
}: {
  name: string
  roleLabel: string
  loginUrl: string
}): EmailTemplate {
  return {
    subject: "Welcome to EdvanceFE",
    html: wrapper(`
      <p>Hi ${name},</p>
      <p>Welcome to EdvanceFE! Your account is set up as a <strong>${roleLabel}</strong>.</p>
      <p>Complete your profile to get the most out of the platform &mdash; better matches, faster applications, and more visibility.</p>
      <div style="margin: 24px 0;">${ctaButton("Log in to EdvanceFE", loginUrl)}</div>
    `),
  }
}

export function applicationStatusEmailTemplate({
  name,
  jobTitle,
  company,
  status,
  link,
}: {
  name: string
  jobTitle: string
  company: string
  status: string
  link: string
}): EmailTemplate {
  const statusLabel = status.charAt(0) + status.slice(1).toLowerCase()
  return {
    subject: `Application update: ${jobTitle}`,
    html: wrapper(`
      <p>Hi ${name},</p>
      <p>Your application for <strong>${jobTitle}</strong> at ${company} is now:</p>
      <p style="font-size: 18px; font-weight: 700; color: #5B4FE8;">${statusLabel}</p>
      <div style="margin: 24px 0;">${ctaButton("View application", link)}</div>
    `),
  }
}

export function dailyDigestEmailTemplate({
  name,
  matches,
  jobsUrl,
}: {
  name: string
  matches: { title: string; company: string; score: number; link: string }[]
  jobsUrl: string
}): EmailTemplate {
  const rows = matches
    .map(
      (m) => `
    <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px;">
      <p style="margin: 0; font-weight: 600;">${m.title}</p>
      <p style="margin: 2px 0 8px; font-size: 13px; color: #6B7280;">${m.company} &middot; ${m.score}% match</p>
      <a href="${m.link}" style="font-size: 13px; color: #5B4FE8; text-decoration: none;">View job &rarr;</a>
    </div>`
    )
    .join("")
  return {
    subject: `${matches.length} new job match${matches.length !== 1 ? "es" : ""} for you today`,
    html: wrapper(`
      <p>Hi ${name},</p>
      <p>Here are your top job matches today:</p>
      ${rows}
      <div style="margin: 24px 0;">${ctaButton("See all jobs", jobsUrl)}</div>
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
