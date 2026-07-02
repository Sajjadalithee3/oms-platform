# Provider Platform Features Implementation Plan

> **For agentic workers:** Execute inline (no test suite exists in this repo — verify via `npx tsc --noEmit` after each task instead of unit tests).

**Goal:** Add credential emails (Resend), provider upload quotas, forced password-reset prompt, login/profile-completion tracking with nudge emails, an advertising system, and bulk learner notifications to the EdvanceFE platform.

**Architecture:** New `lib/email.ts` (Resend wrapper, no-ops gracefully if `RESEND_API_KEY` unset) + `lib/email-templates.ts` (HTML strings) + `lib/quota.ts` (rolling-month doubling schedule). Schema gains `User.lastLoginAt`, `User.mustChangePassword`, `ProviderProfile.learnerQuotaOverride`, and a new `Advertisement` model. Existing bulk-upload routes are extended in place rather than duplicated.

**Tech Stack:** Next.js 14 App Router, Prisma 6/SQLite, NextAuth v5 beta, Resend, lucide-react.

---

## File Structure

- Modify `prisma/schema.prisma` — add fields/model, then `npx prisma db push` + `npx prisma generate`.
- Create `lib/email.ts` — Resend client, `sendEmail`, `sendBatchEmails` (chunks of 100, no-op + console.warn if no API key).
- Create `lib/email-templates.ts` — `credentialsEmailTemplate`, `nudgeEmailTemplate`, `bulkNotificationEmailTemplate`.
- Create `lib/quota.ts` — `monthsSince(date)`, `getProviderLearnerCap(provider)`, `getProviderQuotaStatus(providerId)`.
- Modify `lib/auth.ts` — `authorize` sets `lastLoginAt`; `jwt`/`session` callbacks expose `mustChangePassword`.
- Create `app/api/auth/password-prompt/route.ts` — `PUT` dismiss (set `mustChangePassword=false`).
- Create `app/api/auth/reset-password/route.ts` — `PUT` set new password + clear `mustChangePassword`.
- Create `app/(dashboard)/reset-password/page.tsx` — new password form.
- Create `components/dashboard/PasswordResetPrompt.tsx` — client dialog, mounted in layout.
- Modify `app/(dashboard)/layout.tsx` — mount `PasswordResetPrompt` + `AdBanner`.
- Create `components/shared/AdBanner.tsx` — fetches `/api/ads/active`, renders announcement bar / banner.
- Create `app/api/ads/active/route.ts` — `GET` ads visible to current user.
- Create `app/api/admin/ads/route.ts` (`GET`/`POST`) and `app/api/admin/ads/[id]/route.ts` (`PUT`/`DELETE`).
- Create `app/api/provider/ads/route.ts` (`GET`/`POST`, quota-enforced) and `app/api/provider/ads/[id]/route.ts` (`PUT`/`DELETE`).
- Create `app/api/upload/ad-image/route.ts` — mirrors `app/api/upload/logo/route.ts`.
- Create `app/(dashboard)/admin/ads/page.tsx` and `app/(dashboard)/provider/ads/page.tsx`.
- Create `app/api/admin/providers/[id]/quota/route.ts` — `PUT` sets `learnerQuotaOverride`.
- Modify `app/(dashboard)/admin/providers/page.tsx` — add quota column + override dialog.
- Modify `app/api/upload/cv-bulk/route.ts` — enforce quota (partial-process + skip count), send credential emails.
- Modify `app/api/providers/learners/bulk/route.ts` — same quota + email treatment for CSV path.
- Modify `app/api/providers/learners/route.ts` — include `lastLoginAt` in the select.
- Modify `app/(dashboard)/provider/learners/page.tsx` — add 3 stat cards, login-status column, Nudge button, bulk-select + Notify dialog.
- Create `app/api/providers/learners/nudge/route.ts` — `POST` send nudge email to one learner.
- Create `app/api/providers/learners/notify/route.ts` — `POST` bulk in-app + optional email notify.
- Create `app/(dashboard)/admin/learners/page.tsx` — admin-wide login/completion view.
- Create `app/api/admin/learners/route.ts` — `GET` all learners across providers.
- Create `app/api/admin/learners/nudge/route.ts` — `POST` nudge (admin-triggered).
- Modify `package.json` — add `resend` dependency.
- Modify `.env.example` (create if absent) — add `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`.

---

## Task 1: Schema changes

**Files:** Modify `prisma/schema.prisma`

- [ ] Add to `User` model (after `isActive`):
```prisma
  lastLoginAt       DateTime?
  mustChangePassword Boolean  @default(false)
```
- [ ] Add to `ProviderProfile` model (after `monthlyFee`):
```prisma
  learnerQuotaOverride Int?
```
- [ ] Add relation field to `ProviderProfile`: `ads Advertisement[]`
- [ ] Add new model after `Notification`:
```prisma
model Advertisement {
  id            String    @id @default(cuid())
  type          String
  imageUrl      String?
  text          String?
  externalLink  String?
  startDate     DateTime
  endDate       DateTime
  isActive      Boolean   @default(true)
  createdByRole String
  providerId    String?
  provider      ProviderProfile? @relation(fields: [providerId], references: [id])
  createdAt     DateTime  @default(now())
}
```
- [ ] Run `npx prisma db push` then `npx prisma generate`.
- [ ] Verify: `npx tsc --noEmit` (expect Prisma client errors elsewhere to disappear once generated; no new errors from schema).

## Task 2: Email infrastructure

**Files:** Create `lib/email.ts`, `lib/email-templates.ts`; modify `package.json`

- [ ] `npm install resend`
- [ ] `lib/email.ts` — export `sendEmail({to, subject, html}): Promise<boolean>` and `sendBatchEmails(items: {to,subject,html}[]): Promise<{sent: number; failed: number}>`. Lazily construct `new Resend(process.env.RESEND_API_KEY)`; if env var missing, log `console.warn` and return success=false/0 without throwing. Use `process.env.EMAIL_FROM || "EdvanceFE <noreply@edvancefe.com>"` as from. Batch send via `resend.batch.send()` chunked at 100 per call (Resend's batch limit), looping sequentially.
- [ ] `lib/email-templates.ts` — three exported functions returning `{subject, html}`:
  - `credentialsEmailTemplate({name, email, password, loginUrl})` — branded HTML (purple `#5B4FE8` accent), shows email/password in a bordered box, CTA button to `loginUrl`, line urging them to log in and complete their profile to 100% for better job matching.
  - `nudgeEmailTemplate({name, loginUrl})` — reminder that they haven't logged in / completed profile yet, CTA to `loginUrl`.
  - `bulkNotificationEmailTemplate({name, title, body, link})` — generic notification email, optional CTA button if `link` present.
- [ ] Add `RESEND_API_KEY=`, `EMAIL_FROM="EdvanceFE <noreply@edvancefe.com>"`, `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.example` (create the file if it doesn't exist; check first).
- [ ] Verify: `npx tsc --noEmit`.

## Task 3: Quota library

**Files:** Create `lib/quota.ts`

- [ ] Export `monthsSince(date: Date): number` — full elapsed calendar months (anniversary-aware: subtract 1 if `now.getDate() < date.getDate()`), floor at 0.
- [ ] Export `getProviderLearnerCap(provider: {createdAt: Date; learnerQuotaOverride: number | null}): number` — if `learnerQuotaOverride != null` return it; else `Math.min(20 * 2 ** monthsSince(provider.createdAt), 640)`.
- [ ] Export `async function getProviderQuotaStatus(providerId: string)` — loads provider via `prisma.providerProfile.findUnique`, counts `prisma.learnerProfile.count({where: {providerId}})`, returns `{cap, used, remaining: Math.max(0, cap - used), overridden: provider.learnerQuotaOverride != null}`.
- [ ] Export `getProviderAdCap(): number` — returns `3` (ads per rolling month, flat constant per spec).
- [ ] Export `async function getProviderAdsUsedThisMonth(providerId: string)` — loads provider `createdAt`, computes the start of the *current* rolling month window (`monthsSince(provider.createdAt)` full months added to `provider.createdAt`), counts `prisma.advertisement.count({where: {providerId, createdAt: {gte: windowStart}}})`.
- [ ] Verify: `npx tsc --noEmit`.

## Task 4: Auth — lastLoginAt + mustChangePassword

**Files:** Modify `lib/auth.ts`

- [ ] In `authorize`, after the `bcrypt.compare` success check and before `return`, add:
```ts
await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
```
- [ ] Extend the returned object with `mustChangePassword: user.mustChangePassword`.
- [ ] In `jwt` callback, copy `token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword` when `user` present.
- [ ] In `session` callback, set `session.user.mustChangePassword = token.mustChangePassword as boolean`.
- [ ] These add properties NextAuth's default `Session["user"]` type doesn't have — add a `types/next-auth.d.ts` module augmentation:
```ts
import { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      mustChangePassword: boolean
    } & DefaultSession["user"]
  }
  interface User {
    role: Role
    mustChangePassword: boolean
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    mustChangePassword: boolean
  }
}
```
(check existing `types/` dir / existing augmentation file first — extend it if one already exists instead of creating a duplicate).
- [ ] Verify: `npx tsc --noEmit`.

## Task 5: Force-set mustChangePassword on generated-password creation

**Files:** Modify `app/api/upload/cv-bulk/route.ts`, `app/api/providers/learners/bulk/route.ts`, `app/api/admin/users/route.ts`

- [ ] In each route's `prisma.user.create` call that uses `generatePassword()`, add `mustChangePassword: true` to the `data` object.
- [ ] Verify: `npx tsc --noEmit`.

## Task 6: Password reset prompt UI + APIs

**Files:** Create `app/api/auth/password-prompt/route.ts`, `app/api/auth/reset-password/route.ts`, `app/(dashboard)/reset-password/page.tsx`, `components/dashboard/PasswordResetPrompt.tsx`; modify `app/(dashboard)/layout.tsx`

- [ ] `app/api/auth/password-prompt/route.ts` — `PUT`: `auth()` for session, `prisma.user.update({where: {id: session.user.id}, data: {mustChangePassword: false}})`, return `{ok: true}`.
- [ ] `app/api/auth/reset-password/route.ts` — `PUT`: `auth()` for session, body `{newPassword: string}` (min 8 chars, else 400), `bcrypt.hash`, `prisma.user.update({where: {id: session.user.id}, data: {password: hashed, mustChangePassword: false}})`, return `{ok: true}`.
- [ ] `components/dashboard/PasswordResetPrompt.tsx` — `"use client"` component taking `mustChangePassword: boolean` prop. Local `open` state initialized from prop. Renders a `Dialog` with "Reset your password?" / "You're using a temporary password. Would you like to set a new one now?" Two buttons: "Not now" → `fetch("/api/auth/password-prompt", {method:"PUT"})` then close; "Yes, reset it" → same dismiss call, then `router.push("/reset-password")`.
- [ ] `app/(dashboard)/reset-password/page.tsx` — `"use client"` page: `TopBar title="Reset Password"`, two password inputs (new + confirm), client-side match + length≥8 validation, submit → `PUT /api/auth/reset-password`, on success `router.push` to role dashboard root (use `useSession` from `next-auth/react` for role, or just `router.push("/")` and let middleware redirect to the role's dashboard).
- [ ] Modify `app/(dashboard)/layout.tsx` — import and render `<PasswordResetPrompt mustChangePassword={session.user.mustChangePassword} />` right after `<Sidebar>` opening (as a sibling inside the flex container, since Dialog portals don't need layout placement).
- [ ] Verify: `npx tsc --noEmit`. Manually confirm flow not required (no browser verification mandated for this scope per session preference — see Task 13).

## Task 7: Admin quota override

**Files:** Create `app/api/admin/providers/[id]/quota/route.ts`; modify `app/(dashboard)/admin/providers/page.tsx`

- [ ] `app/api/admin/providers/[id]/quota/route.ts` — `PUT`: require `session.user.role === "SUPER_ADMIN"`, body `{quota: number | null}` (null clears override, re-enabling doubling), `prisma.providerProfile.update({where: {id: params.id}, data: {learnerQuotaOverride: quota}})`, return updated provider with computed `getProviderQuotaStatus`.
- [ ] In `admin/providers/page.tsx`, add a "Quota" column showing `cap` (fetch `getProviderQuotaStatus` per row via a new lightweight API or extend the existing providers list GET to include `learnerQuotaOverride` + computed cap/used/remaining) and a button opening a small dialog with a number input (blank = automatic doubling) that calls the new PUT route.
- [ ] Check `app/api/admin/providers/route.ts`'s GET — extend its `select`/response shape to include `learnerQuotaOverride` and a computed `quotaCap`/`quotaUsed` via `getProviderQuotaStatus` per provider (call it in a loop or `Promise.all`).
- [ ] Verify: `npx tsc --noEmit`.

## Task 8: Quota enforcement + credential emails in bulk upload

**Files:** Modify `app/api/upload/cv-bulk/route.ts`, `app/api/providers/learners/bulk/route.ts`

- [ ] In `cv-bulk/route.ts`: after loading `provider`, call `getProviderQuotaStatus(provider.id)`. If `remaining <= 0`, return `201` immediately with `{results: [], created: 0, failed: 0, skippedDueToQuota: files.length, quota: {...}}`. Otherwise slice `files` to `files.slice(0, remaining)`, track `skippedDueToQuota = files.length - processed.length`.
- [ ] After the main loop, collect credential emails for every `results` entry with `status === "created"`: `{to: r.email, ...credentialsEmailTemplate({name: r.name, email: r.email, password: r.password, loginUrl: \`${process.env.NEXT_PUBLIC_APP_URL}/login\`})}`. Call `sendBatchEmails(...)`, capture `{sent, failed}`.
- [ ] Response shape becomes `{results, created, failed, skippedDueToQuota, emailsSent, emailsFailed, quota: {cap, used: used+created, remaining: remaining-created}}`.
- [ ] Read `app/api/providers/learners/bulk/route.ts` in full before editing (full content not yet read — read it now) and apply the equivalent quota-slice + skip-count + credential-email treatment to its row-processing loop (it creates learners from parsed CSV rows with `generatePassword()` per the earlier summary; mirror cv-bulk's pattern exactly, reusing `getProviderQuotaStatus` and `sendBatchEmails`).
- [ ] Verify: `npx tsc --noEmit`.

## Task 9: Login-status stats + Nudge — provider side

**Files:** Modify `app/api/providers/learners/route.ts`, `app/(dashboard)/provider/learners/page.tsx`; create `app/api/providers/learners/nudge/route.ts`

- [ ] `app/api/providers/learners/route.ts` GET — include `user: {select: {email: true, lastLoginAt: true}}` (or extend existing `include`) so the frontend gets `lastLoginAt` per learner.
- [ ] `app/api/providers/learners/nudge/route.ts` — `POST` body `{learnerUserId: string}`: verify caller is the owning provider (or admin), load the target user's name/email, send `nudgeEmailTemplate` via `sendEmail`, return `{sent: boolean}`.
- [ ] In `provider/learners/page.tsx`: compute three counts from the loaded learners array — `completed` (`lastLoginAt` truthy && `profileComplete === 100`), `loggedInIncomplete` (`lastLoginAt` truthy && `profileComplete < 100`), `neverLoggedIn` (`!lastLoginAt`). Render 3 small stat cards above the table. Add a "Login" column (Badge: green "Active" if lastLoginAt, gray "Never logged in" if not). For rows where `!lastLoginAt`, render a "Nudge" button calling the new nudge route with that row's `userId`, disable + show "Sent" briefly on success.
- [ ] Verify: `npx tsc --noEmit`.

## Task 10: Login-status stats + Nudge — admin side

**Files:** Create `app/api/admin/learners/route.ts`, `app/api/admin/learners/nudge/route.ts`, `app/(dashboard)/admin/learners/page.tsx`

- [ ] `app/api/admin/learners/route.ts` — `GET`: require `SUPER_ADMIN`, `prisma.learnerProfile.findMany({include: {user: {select:{name:true,email:true,lastLoginAt:true}}, provider: {select:{organisationName:true}}}})`, return flattened array.
- [ ] `app/api/admin/learners/nudge/route.ts` — same body/logic as the provider nudge route minus the ownership check (admin can nudge anyone).
- [ ] `app/(dashboard)/admin/learners/page.tsx` — mirrors the provider learners stat-cards + table pattern but scoped to all providers, with a "Provider" column, using `DataTable`. Add to admin sidebar nav if a nav-items file exists for admin links (check `components/dashboard/Sidebar.tsx` first and add an entry consistent with existing admin nav items).
- [ ] Verify: `npx tsc --noEmit`.

## Task 11: Bulk notifications (provider)

**Files:** Create `app/api/providers/learners/notify/route.ts`; modify `app/(dashboard)/provider/learners/page.tsx`

- [ ] `app/api/providers/learners/notify/route.ts` — `POST` body `{learnerUserIds: string[], title: string, body: string, link?: string, sendEmail: boolean}`: verify all `learnerUserIds` belong to learners under the caller's `providerId`, bulk-create `Notification` rows via `prisma.notification.createMany({data: learnerUserIds.map(userId => ({userId, title, body, type: "ANNOUNCEMENT", link: link || null}))})`. If `sendEmail`, look up each user's email/name and `sendBatchEmails` using `bulkNotificationEmailTemplate`. Return `{notified: learnerUserIds.length, emailsSent, emailsFailed}`.
- [ ] In `provider/learners/page.tsx`: add row checkboxes (reuse the `selectable`/`selectedIds`/`onSelectionChange` props the `DataTable` component already supports, per the pattern in `admin/jobs/page.tsx`) and a "Notify Selected" button that opens a dialog with title/body/link inputs + an "Also send email" checkbox, submitting to the new route.
- [ ] Verify: `npx tsc --noEmit`.

## Task 12: Advertisement system

**Files:** Create `app/api/upload/ad-image/route.ts`, `app/api/admin/ads/route.ts`, `app/api/admin/ads/[id]/route.ts`, `app/api/provider/ads/route.ts`, `app/api/provider/ads/[id]/route.ts`, `app/api/ads/active/route.ts`, `app/(dashboard)/admin/ads/page.tsx`, `app/(dashboard)/provider/ads/page.tsx`, `components/shared/AdBanner.tsx`; modify `app/(dashboard)/layout.tsx`

- [ ] `app/api/upload/ad-image/route.ts` — copy `app/api/upload/logo/route.ts` pattern exactly, but allow `SUPER_ADMIN` and `TRAINING_PROVIDER`, store under `public/uploads/ads/`, return `{url}`.
- [ ] `app/api/admin/ads/route.ts` — `GET` (all ads, `SUPER_ADMIN` only) / `POST` (create with `createdByRole: "SUPER_ADMIN"`, `providerId: null`, validates `type` is `"BANNER_IMAGE"` or `"ANNOUNCEMENT_BAR"`, `startDate`/`endDate` required).
- [ ] `app/api/admin/ads/[id]/route.ts` — `PUT`/`DELETE`, `SUPER_ADMIN` only.
- [ ] `app/api/provider/ads/route.ts` — `GET` (own ads only, `prisma.advertisement.findMany({where: {providerId: provider.id}})`) / `POST`: load provider, call `getProviderAdsUsedThisMonth(provider.id)`; if `>= getProviderAdCap()` return 403 `{error: "Monthly ad limit (3) reached"}`; else create with `createdByRole: "TRAINING_PROVIDER"`, `providerId: provider.id`.
- [ ] `app/api/provider/ads/[id]/route.ts` — `PUT`/`DELETE`, scoped to ads where `providerId` matches caller's provider.
- [ ] `app/api/ads/active/route.ts` — `GET`: `auth()` for session, `const now = new Date()`. Query `prisma.advertisement.findMany({where: {isActive: true, startDate: {lte: now}, endDate: {gte: now}}})`. Filter in JS: keep ad if `ad.createdByRole === "SUPER_ADMIN"` (visible to all), OR (`ad.createdByRole === "TRAINING_PROVIDER"` AND caller's role is `LEARNER` AND caller's `learnerProfile.providerId === ad.providerId`). For `LEARNER` callers, fetch their `learnerProfile.providerId` first. Return the filtered array.
- [ ] `app/(dashboard)/admin/ads/page.tsx` — list (Card per ad: type badge, dates, active toggle, delete) + "New Ad" dialog (type select, conditionally image-upload-via-`ad-image`-route or text input, externalLink input, start/end date pickers using plain `<input type="date">`).
- [ ] `app/(dashboard)/provider/ads/page.tsx` — same UI, plus a "X / 3 used this month" indicator (fetch from the GET response's count or compute client-side from returned ads' `createdAt` against the current rolling window — simplest: have the GET route also return `{ads, used, cap}`), disable "New Ad" button when `used >= cap`.
- [ ] `components/shared/AdBanner.tsx` — `"use client"`, on mount `fetch("/api/ads/active")`, render the first `ANNOUNCEMENT_BAR` ad as a full-width dismissible top bar (text + optional external link) and the first `BANNER_IMAGE` ad as a card (`<img>` wrapped in `<a>` if `externalLink` set) underneath it. Render nothing if no ads.
- [ ] Modify `app/(dashboard)/layout.tsx` — render `<AdBanner />` inside `<main>` before `{children}`.
- [ ] Add "Ads" nav entries to `components/dashboard/Sidebar.tsx` for both `SUPER_ADMIN` and `TRAINING_PROVIDER` role sections, following the existing nav-item pattern in that file.
- [ ] Verify: `npx tsc --noEmit`.

## Task 13: Final verification

- [ ] `npx tsc --noEmit --pretty` — zero errors.
- [ ] `npx prisma validate` — schema valid.
- [ ] Grep the repo for any leftover references to fields/functions renamed during this plan to confirm none were missed.
- [ ] Summarize for the user: what was built, what still needs `RESEND_API_KEY`/domain verification to go live, and any follow-ups (e.g., Resend plan tier for volume).

---

## Self-Review Notes

- Spec coverage: Feature 1 (credentials email) → Tasks 2, 8. Feature 2 (quota) → Tasks 3, 7, 8. Feature 3 (password reset prompt) → Tasks 4, 5, 6. Feature 4 (login/completion tracking + nudge) → Tasks 9, 10. Feature 5 (ads) → Task 12. Feature 6 (bulk notify) → Task 11. All six covered.
- `app/api/providers/learners/bulk/route.ts` full content wasn't read during exploration — Task 8 explicitly calls for reading it before editing rather than guessing its shape.
- Type augmentation file location unconfirmed — Task 4 explicitly says to check for an existing `types/next-auth.d.ts` before creating a duplicate.
