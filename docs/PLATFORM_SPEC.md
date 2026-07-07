# EdvanceFE OMS Platform — Complete Specification

> Hand this document to a new chat to build the next version. Every feature, color, role, API, and data model is documented here.

---

## 1. Project Overview

**EdvanceFE** is an Outcome Management System (OMS) connecting training providers, learners, job seekers, and employers in the UK funded-skills sector. It tracks learner progress through courses, matches candidates to jobs, facilitates employer hiring, and gives administrators full oversight.

**Deployment**: Railway (SQLite on a mounted volume `/data/prod.db`)  
**URL**: `https://oms-platform-production.up.railway.app`  
**GitHub**: `https://github.com/Sajjadalithee3/oms-platform`

---

## 2. Tech Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js App Router | 14.2.35 |
| Language | TypeScript | 5 |
| Auth | NextAuth.js (Auth.js) | v5 beta 25 |
| ORM | Prisma | 6.19.3 |
| Database | SQLite | (via Prisma) |
| Styling | Tailwind CSS + shadcn/ui | 3.4.1 |
| Charts | Recharts | 3.8.1 |
| Email | Resend | 6.14.0 |
| PDF | jsPDF | 4.2.1 |
| CV Parsing | pdf2json + mammoth | custom |
| Job RSS | fast-xml-parser | 5.8.0 |
| Icons | lucide-react | 1.17.0 |
| Passwords | bcryptjs | 3.0.3 |
| XML sanitize | dompurify | 3.4.10 |

---

## 3. Design System

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#5B4FE8` | Sidebar active link bg, buttons, accent |
| `dark` | `#1A1A2E` | Page headings, primary text |
| `white` | `#FFFFFF` | Sidebar bg, cards, top bar |
| `gray-50` | `#F9FAFB` | Page background |
| `gray-100` | `#F3F4F6` | Hover states, inactive nav |
| `gray-200` | `#E5E7EB` | Borders (sidebar, cards, top bar) |
| `gray-400` | `#9CA3AF` | Subtext, role label in sidebar |
| `gray-500` | `#6B7280` | Body text |
| `gray-600` | `#4B5563` | Nav item text |
| RAG Green | `bg-green-100 text-green-700` | Learner status GREEN |
| RAG Amber | `bg-amber-100 text-amber-700` | Learner status AMBER |
| RAG Red | `bg-red-100 text-red-700` | Learner status RED |

### Typography

- **Font**: Inter (Google Fonts), fallback `system-ui, sans-serif`
- **Page title** (TopBar): `text-xl font-semibold text-[#1A1A2E]`
- **Section title**: `text-lg font-semibold text-[#1A1A2E]`
- **Sidebar brand**: `text-2xl font-bold text-primary`
- **Nav items**: `text-sm font-medium`
- **Body/meta**: `text-sm text-gray-500`

### Layout

```
┌─────────────────────────────────────────────────┐
│ Sidebar (w-64, fixed left, white, border-r)      │
│  ┌───────────────────────────────────────────┐   │
│  │ Logo: "EdvanceFE"  Role subtitle          │   │
│  │ ─────────────────────────────────────     │   │
│  │ Nav items (icon + label, active=primary)  │   │
│  │ ─────────────────────────────────────     │   │
│  │ Avatar + name + Sign out                  │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
│ Main content area                                 │
│  ┌──────────────────────────────────────────┐    │
│  │ TopBar (h-16, white, border-b)           │    │
│  │  Page Title                  🔔 Bell     │    │
│  ├──────────────────────────────────────────┤    │
│  │ Page content (p-6)                       │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

- Sidebar: `hidden md:flex md:flex-col md:w-64 md:min-h-screen bg-white border-r border-gray-200`
- Mobile: hamburger button `fixed top-4 left-4 z-50 md:hidden`, drawer with backdrop
- TopBar: `h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6`
- Content bg: `bg-gray-50 min-h-screen`

### shadcn/ui Components Used

`Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Badge`, `Input`, `Textarea`, `Select`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`, `Progress`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`

---

## 4. Authentication & Authorization

### NextAuth v5 (Credentials Provider)

- Strategy: **JWT** (stored in cookie)
- Session expiry: default NextAuth (30 days)
- Login page: `/login`
- Signup page: `/signup` (creates JOB_SEEKER by default)
- After login: redirect to role dashboard
- Production requirement: `AUTH_TRUST_HOST=true` env var

### JWT Payload

```ts
{
  id: string        // user.id
  email: string
  name: string
  role: Role        // one of 6 enum values
  mustChangePassword: boolean
}
```

### `lastLoginAt` Tracking

Updated on every successful login via `prisma.user.update({ data: { lastLoginAt: new Date() } })`.

### `mustChangePassword` Flow

When admin/provider creates a user account and generates a password, `mustChangePassword = true` is set. On first login the user hits `/reset-password` before accessing any dashboard.

### Impersonation (Admin only)

- POST `/api/admin/impersonate` sets cookie `impersonate_user_id`
- Middleware detects cookie: if admin + impersonating, skips role-route guards
- Allows SUPER_ADMIN to view any role's dashboard

### Middleware Route Guards

```
/admin      → SUPER_ADMIN only
/staff      → INTERNAL_STAFF, SUPER_ADMIN
/provider   → TRAINING_PROVIDER, SUPER_ADMIN
/employer   → EMPLOYER, SUPER_ADMIN
/learner    → LEARNER only
/jobseeker  → JOB_SEEKER only
/           → redirect to role dashboard or /login
```

---

## 5. Roles & Privileges

### 5.1 SUPER_ADMIN

**Email**: `admin@edvancefe.com` / `Admin@1234`

**Sidebar**:
| Page | Path | Purpose |
|------|------|---------|
| Overview | `/admin` | KPI cards + charts |
| Providers | `/admin/providers` | Manage training providers + quota override |
| Learners | `/admin/learners` | All learners across all providers + nudge |
| Employers | `/admin/employers` | View/manage employer accounts |
| Jobs | `/admin/jobs` | All jobs, bulk delete |
| Users | `/admin/users` | Create/suspend/delete user accounts |
| Scraper | `/admin/scraper` | Job board config + RSS field mapping + run |
| Matching | `/admin/matching` | Trigger matching engine for all jobs/candidates |
| Messages | `/admin/messages` | Read-only view all application messages |
| Interviews | `/admin/interviews` | All interviews + PDF download |
| Ads | `/admin/ads` | Global advertisement CRUD |
| Audit Log | `/admin/audit` | Full system audit trail |
| Analytics | `/admin/analytics` | Charts: jobs, applications, matches, registrations |
| Settings | `/admin/settings` | System settings (min match threshold) |

**Exclusive privileges**:
- Impersonate any user
- Set provider learner quota override
- Delete/suspend any user
- Configure job board scrapers
- Trigger global matching run
- Create/manage system-wide ads
- View full audit log
- Download interview PDF confirmations
- Seed UK jobs (`/api/scraper/seed-uk`)
- Access cron endpoint (`/api/scraper/cron`)

---

### 5.2 INTERNAL_STAFF

**Email**: `staff@edvancefe.com` / `Staff@1234`

**Sidebar**:
| Page | Path | Purpose |
|------|------|---------|
| Overview | `/staff` | Summary cards |
| Candidates | `/staff/candidates` | View all candidates (learners + job seekers) |
| Jobs | `/staff/jobs` | Browse all active jobs |
| Pipeline | `/staff/pipeline` | Application pipeline view (Kanban-style status) |
| Matching | `/staff/matching` | Run matching for individual candidates/jobs |
| Analytics | `/staff/analytics` | Read-only analytics |

**Privileges**: Read-only access to all data; can trigger matching; cannot create/delete users, configure scraper, or manage ads.

---

### 5.3 TRAINING_PROVIDER

**Email**: `provider@codeinstitute.com` / `Provider@1234`

**Sidebar**:
| Page | Path | Purpose |
|------|------|---------|
| Overview | `/provider` | Learner count, quota bar, login stats |
| Learners | `/provider/learners` | Own learners: RAG status, milestones, nudge, bulk upload |
| Jobs | `/provider/jobs` | Browse jobs relevant to learners' sectors |
| Courses | `/provider/courses` | Create/manage courses |
| Cohorts | `/provider/cohorts` | Create/manage cohorts per course |
| Ads | `/provider/ads` | Create/manage own ads (max 3/month) |
| Messages | `/provider/messages` | View messages in applications for their learners |
| Analytics | `/provider/analytics` | Learner progress charts |

**Privileges**:
- CRUD own courses and cohorts
- Enrol learners into cohorts
- Bulk upload learners via CSV
- Bulk upload CVs (ZIP of PDFs/DOCXs)
- Send credentials email to learners
- Send nudge notifications to inactive learners
- Send bulk notifications to all own learners
- Create advertisements (up to 3/month cap)
- Override: Admin can increase learner quota cap

**Learner Quota**: Starts at 20, doubles each month since account creation (cap: 640). Formula: `min(20 × 2^monthsSince(createdAt), 640)`. Admin can override with a fixed number.

---

### 5.4 EMPLOYER

**Email**: `employer@techcorp.com` / `Employer@1234`

**Sidebar**:
| Page | Path | Purpose |
|------|------|---------|
| Overview | `/employer` | Active jobs, total applications |
| Profile | `/employer/profile` | Company info, logo upload |
| Jobs | `/employer/jobs` | Post/manage own jobs |
| Applications | `/employer/applications` | Review applications, update status |
| Interviews | `/employer/interviews` | Schedule/manage interviews |
| Messages | `/employer/messages` | Message candidates on applications |
| Analytics | `/employer/analytics` | Application funnel charts |

**Application statuses**: `APPLIED → SHORTLISTED → INTERVIEWING → OFFERED → HIRED / REJECTED`

**Interview statuses**: `PENDING → CONFIRMED → COMPLETED / CANCELLED`

**Privileges**: Full CRUD own jobs; manage own applications and interviews; message candidates.

---

### 5.5 LEARNER

**Email**: `learner@edvancefe.com` / `Learner@1234`

**Sidebar**:
| Page | Path | Purpose |
|------|------|---------|
| Overview | `/learner` | Profile completion %, matched jobs count |
| Profile | `/learner/profile` | Personal info, CV upload, skills, experience, education, certs |
| Jobs | `/learner/jobs` | Browse matched jobs (sorted by score) |
| Applications | `/learner/applications` | Track applications |
| Messages | `/learner/messages` | Message employers |

**Privileges**: Edit own profile; upload CV (PDF/DOCX auto-parsed); apply to jobs; view match scores; message employers on applications. Cannot see other learners or any admin data.

**Profile completion** is a 0–100 integer calculated from: photo, headline, bio, phone, location, CV, skills (≥3), desired roles, work experience, education, certificates.

---

### 5.6 JOB_SEEKER

**Email**: `seeker@edvancefe.com` / `Seeker@1234`

**Sidebar** (same structure as LEARNER):
| Page | Path | Purpose |
|------|------|---------|
| Overview | `/jobseeker` | Matches, applications |
| Profile | `/jobseeker/profile` | CV, skills, desired roles, salary range, remote pref |
| Jobs | `/jobseeker/jobs` | Browse matched jobs |
| Applications | `/jobseeker/applications` | Track applications |
| Messages | `/jobseeker/messages` | Message employers |

**Differences from LEARNER**: Not attached to a provider/cohort; no RAG status or milestones; `courseSector` is null so matching uses only skills/location/seniority.

---

## 6. Database Schema

### User
```
id                  String  @id cuid
email               String  @unique
password            String  (bcrypt hashed)
role                Role    (enum)
name                String?
isActive            Boolean @default(true)
lastLoginAt         DateTime?
mustChangePassword  Boolean @default(false)
createdAt           DateTime
updatedAt           DateTime
```

### Role enum
`SUPER_ADMIN | INTERNAL_STAFF | TRAINING_PROVIDER | EMPLOYER | LEARNER | JOB_SEEKER`

### ProviderProfile
```
id                   cuid
userId               unique FK → User
organisationName     String
logo                 String? (URL)
website, location, description
contactName, contactEmail, contactPhone
isActive             Boolean @default(true)
billingStatus        String @default("ACTIVE")
monthlyFee           Float @default(0)
learnerQuotaOverride Int? (null = use formula)
```

### LearnerProfile
```
id, userId (unique FK → User), providerId (FK → ProviderProfile)
cohortId             FK → Cohort (optional)
headline, bio, phone, location, photo (URL)
cvFile (URL), cvText (raw extracted text)
skills               String (JSON array)
desiredRoles         String (JSON array)
desiredSalaryMin/Max Int?
desiredLocation      String?
remotePreference     String? (OFFICE/HYBRID/REMOTE)
linkedIn, github, portfolio
courseName, courseSector
courseStartDate/EndDate DateTime?
ragStatus            String @default("GREEN") (GREEN/AMBER/RED)
ms1Achieved/ms2Achieved/ms3Achieved  Boolean
ms1Date/ms2Date/ms3Date  DateTime?
profileComplete      Int @default(0)
credentialsSent      Boolean @default(false)
```

### JobSeekerProfile
```
id, userId (unique FK → User)
headline, bio, phone, location, photo, cvFile, cvText
skills, desiredRoles  (JSON arrays)
desiredSalaryMin/Max, desiredLocation, remotePreference
linkedIn, github, portfolio
profileComplete       Int @default(0)
```

### EmployerProfile
```
id, userId (unique FK → User)
companyName, companyLogo, industry, companySize
location, website, description, linkedIn, twitter
isVerified           Boolean @default(false)
isActive             Boolean @default(true)
```

### Course
```
id, providerId (FK → ProviderProfile)
name, sector
requiredSkills       String (JSON array)
duration             String? (e.g., "12 months")
description          String?
isActive             Boolean
```

### Cohort
```
id, providerId, courseId
name                 String
startDate/endDate    DateTime?
expectedLearners     Int @default(0)
```

### Job
```
id, employerId? (FK → EmployerProfile, null for scraped jobs)
title, company, location
region, country, state, city
sector, category, jobType (FULL_TIME/PART_TIME/CONTRACT/etc.)
salaryMin/Max        Int?
salaryCurrency       String? (default GBP)
salaryPeriod         String? (ANNUAL/HOURLY)
description          String
requiredSkills       String (JSON array)
experienceLevel      String? (ENTRY/MID/SENIOR)
qualifications       String?
contractType         String?
workingHours         String?
deadline, publishedAt, expiresAt  DateTime?
sourceType           String @default("INTERNAL") (INTERNAL/REED/ADZUNA/RSS/GENERIC)
sourceUrl, sourceBoardId, externalId (unique, prevents re-import)
status               String @default("ACTIVE") (ACTIVE/CLOSED/EXPIRED)
isRemote             Boolean @default(false)
```

### JobMatch
```
id, jobId (FK → Job)
jobSeekerId? (FK → JobSeekerProfile)
learnerId?   (FK → LearnerProfile)
matchScore   Int (0–100)
matchedSkills String (JSON array)
missingSkills String (JSON array)
```

### Application
```
id, jobId, jobSeekerId?, learnerId?
status       String @default("APPLIED")
coverNote    String?
matchScore   Int?
```

### Message
```
id, applicationId (FK → Application)
senderId (FK → User)
content  String
isRead   Boolean @default(false)
```

### Interview
```
id, applicationId, employerId
proposedSlots  String (JSON array of ISO datetime strings)
confirmedSlot  DateTime?
status         String @default("PENDING")
location       String?
meetingLink    String?
notes          String?
```

### JobBoard
```
id, name, boardType (REED/ADZUNA/RSS/GENERIC/CRON)
apiKey, feedUrl, genericUrl
schedule      String @default("DAILY") (DAILY/WEEKLY/MANUAL)
scheduleTime  String @default("06:00")
isActive      Boolean
lastFetchedAt DateTime?
lastJobCount  Int @default(0)
lastError     String?
fieldMappings String @default("{}") (JSON field mapping config)
filterLocation, filterCategory  String?
maxJobs       Int @default(100)
filterDummy   Boolean @default(true)
```

### SystemSetting
```
id, key String @unique, value String
```
Current key: `min_match_threshold` (default: "40")

### Notification
```
id, userId, title, body, type, isRead, link, createdAt
```

### Advertisement
```
id, type (BANNER/POPUP/SIDEBAR)
imageUrl, text, externalLink
startDate, endDate  DateTime
isActive    Boolean @default(true)
createdByRole  String (SUPER_ADMIN/TRAINING_PROVIDER)
providerId?  FK → ProviderProfile
```

### AuditLog
```
id, userId?, action (CREATE/UPDATE/DELETE/LOGIN/etc.)
entity, entityId, detail, ipAddress, createdAt
```

### Experience / Education / Certificate
Shared between LearnerProfile and JobSeekerProfile via nullable FKs:
- `Experience`: title, company, location, startDate, endDate, current, description
- `Education`: institution, degree, field, startDate, endDate, current
- `Certificate`: name, issuer, issueDate, fileUrl

---

## 7. CV Parser (`lib/cv-parser.ts`)

Parses PDF and DOCX files and extracts structured data.

### Supported Formats
- **PDF**: via `pdf2json` (reads text layer; does NOT support scanned/image PDFs)
- **DOCX**: via `mammoth` (extractRawText)

### Extraction Pipeline

1. **Text extraction** from binary buffer
2. **Line splitting** — split on `\n`, trim, filter empty
3. **Section detection** — regex headers detect: `preamble | summary | experience | education | skills | certificates | references`
4. **Per-section extraction**:

| Field | Method |
|-------|--------|
| `name` | Looks for "Name:" label or title-case 2–4 word line in preamble |
| `email` | Regex `[\w.-]+@[\w.-]+\.\w+` |
| `phone` | Regex UK phone `(\+44\|0)[\s\d\-()]{9,14}` |
| `location` | Labelled "Location:" or scans for UK city names (30 cities) or UK postcode |
| `skills` | Section tokens split on `,•|·;` + vocab matching against 80-term SKILL_VOCAB |
| `experience` | Date-range anchors (regex), lookback 2 lines for title/company |
| `education` | Degree keyword detection (BSc/MSc/NVQ/BTEC/etc.) |
| `certificates` | Cert keyword detection (CSCS/SMSTS/NEBOSH/First Aid/etc.) |

### Date Parsing
Supports: `Jan 2020`, `01/2020`, `2020`, ranges with `-–—to until`, "present/current/now"

### Output Interface
```ts
interface ParsedCV {
  rawText: string
  name: string
  email: string
  phone: string
  location: string
  skills: string[]        // max 30
  experience: ParsedExperience[]  // max 8
  education: ParsedEducation[]    // max 5
  certificates: ParsedCertificate[]  // max 8
}
```

---

## 8. Job Matching Algorithm (`lib/matching.ts`)

Weighted scoring across 5 dimensions, max score 100.

### Weights
| Dimension | Points |
|-----------|--------|
| Skills | 50 |
| Sector | 20 |
| Location | 15 |
| Seniority | 10 |
| Job title / desired role | 5 |

### Scoring Logic

**Skills (50pts)**  
`(matchedSkills.length / job.requiredSkills.length) * 50`  
Case-insensitive substring matching (skill A contains B or vice versa).

**Sector (20pts)**  
Exact case-insensitive match between `candidate.courseSector` (learners) or empty (job seekers) and `job.sector`. Full 20 or 0.

**Location (15pts)**  
Exact match = 15pts; one contains other = 10.5pts; no match = 0.

**Seniority (10pts)**  
Calculates total years from experience entries. Maps to ENTRY (≤3yr), MID (2–6yr), SENIOR (≥5yr). Match = 10pts, mismatch = 3–5pts.

**Title (5pts)**  
Checks if any `candidate.desiredRoles` substring-matches `job.title`. Match = 5pts.

### Trigger Points
- After CV upload or profile save → `runMatchingForCandidate(id, role)`
- After job posted/updated → `runMatchingForJob(jobId)`
- Admin/staff can trigger global run → `runAllMatching()`

### Threshold
`SystemSetting.min_match_threshold` (default 40). Currently stored but not used to filter display — shows all matches sorted by score.

---

## 9. Job Fetcher / Scraper (`app/api/scraper/`)

### Board Types

| Type | Auth | Method |
|------|------|--------|
| `REED` | API key | REST API (not yet implemented, placeholder) |
| `ADZUNA` | App ID + Key | REST API (not yet implemented, placeholder) |
| `RSS` | None | XML feed (`fast-xml-parser`) |
| `GENERIC` | None | Custom URL, field-mapped |
| `CRON` | None | Internal scheduled runner |

### RSS Ingestion Flow
1. Fetch XML from `feedUrl`
2. Parse with `fast-xml-parser`
3. Apply `fieldMappings` (JSON config) to map feed fields → Job columns
4. Filter by `filterLocation` and `filterCategory` if set
5. Skip if `externalId` already exists (idempotent)
6. Create Job with `sourceType = "RSS"` and `sourceBoardId = board.id`
7. Auto-trigger `runMatchingForJob` for each new job

### Field Mapping UI (`/admin/scraper/[id]/mapping`)
Visual mapping of RSS/generic feed fields → platform Job fields. Stored as JSON in `JobBoard.fieldMappings`.

### RSS Preview
`POST /api/scraper/preview-rss` — fetches and returns first 5 parsed jobs for review before committing the mapping.

### Cron
`GET /api/scraper/cron` — protected by `CRON_SECRET` header. Runs all active boards. Designed for Railway cron or external scheduler.

### Run on Demand
`POST /api/scraper/run/[boardId]` — triggers fetch for a single board. Admin only.

### UK Seed Jobs
`POST /api/scraper/seed-uk` — seeds 50 realistic UK jobs across Health, Tech, Construction, Education sectors. Admin only.

### Metrics Stored
After each run: `lastFetchedAt`, `lastJobCount`, `lastError` stored on JobBoard.

---

## 10. PDF Generation (`app/api/admin/interviews/pdf`)

Generates interview confirmation PDFs using **jsPDF**.

### Output
Single-page A4 PDF with:
- Platform header with date
- Candidate name + type (Learner/Job Seeker)
- Job title + company
- Employer company name
- Interview date/time (confirmed slot)
- Location or meeting link
- Interview status badge
- Match score (if available)
- Footer: "Generated by EdvanceFE OMS"

**Endpoint**: `GET /api/admin/interviews/pdf?id={interviewId}`  
**Auth**: SUPER_ADMIN only  
**Response**: `application/pdf` blob with filename `interview-confirmation-{last6}.pdf`

---

## 11. Email System (`lib/email.ts`)

Provider: **Resend**  
From address: `EdvanceFE <noreply@edvancefe.com>`  
Env var: `RESEND_API_KEY`

### Functions

```ts
sendEmail({ to, subject, html }): Promise<boolean>
sendBatchEmails(items): Promise<{ sent: number; failed: number }>
// sendBatchEmails chunks at 100 per Resend batch request
```

### Email Triggers

| Trigger | Recipients | Template |
|---------|-----------|----------|
| Learner bulk upload | Each new learner | Welcome + login credentials |
| Credentials reset | Learner | New password credentials |
| Nudge (provider) | Selected learner(s) | Log in reminder |
| Nudge (admin) | Any inactive learner | Log in reminder |
| Bulk notify (provider) | All own learners | Custom message |

### Graceful Degradation
If `RESEND_API_KEY` is not set, `sendEmail` returns `false` and logs a warning — no crash. The platform functions without email configured.

---

## 12. Quota System (`lib/quota.ts`)

### Provider Learner Quota

```
cap = learnerQuotaOverride ?? min(20 × 2^monthsSince(createdAt), 640)
```

- Month 0: 20 learners
- Month 1: 40
- Month 2: 80
- ...caps at 640

Admin can override with a fixed number via `PATCH /api/admin/providers/[id]/quota`.

### Provider Ad Quota
- Fixed cap: **3 advertisements per month** (per billing window from `createdAt`)
- `getProviderAdsUsedThisMonth(providerId)` counts ads created since start of current billing window

---

## 13. Advertisement System

### Types
`BANNER | POPUP | SIDEBAR`

### Who Can Create
- **SUPER_ADMIN**: Unlimited, system-wide, no provider association
- **TRAINING_PROVIDER**: Max 3/month, scoped to `providerId`

### Fields
- `type`: display type
- `imageUrl`: uploaded via `/api/upload/ad-image`
- `text`: optional overlay text
- `externalLink`: click-through URL
- `startDate / endDate`: active window
- `isActive`: manual toggle

### Display
`AdBanner` component queries `GET /api/ads/active` (returns ads where `isActive=true` and `now` is within `startDate–endDate`). Rendered in relevant dashboard areas.

### Admin CRUD
- `GET/POST /api/admin/ads`
- `PATCH/DELETE /api/admin/ads/[id]`

### Provider CRUD
- `GET/POST /api/provider/ads`
- `PATCH/DELETE /api/provider/ads/[id]`

---

## 14. Bulk Operations

### Bulk Learner Upload (Provider)

**Endpoint**: `POST /api/providers/learners/bulk`  
**Format**: CSV with headers: `name, email, phone, location, courseName, cohortId`  
**Flow**:
1. Parse CSV rows
2. Check quota — reject if would exceed cap
3. For each row: create User (LEARNER role), generate random password, set `mustChangePassword=true`, create LearnerProfile
4. Send credentials email via Resend if `RESEND_API_KEY` set
5. Return `{ created, failed, errors[] }`

### Bulk CV Upload (Provider)

**Endpoint**: `POST /api/upload/cv-bulk`  
**Format**: ZIP file containing PDF/DOCX files  
**Flow**:
1. Extract ZIP in memory
2. For each file: parse CV with `parseCV()`
3. Match filename/email to existing LearnerProfile
4. Update `cvText`, `skills`, `experiences`, `educations`, `certificates`
5. Trigger matching run for each updated learner
6. Return summary of updated/failed

### Bulk Job Delete (Admin)

**Endpoint**: `POST /api/jobs/bulk-delete`  
**Body**: `{ ids: string[] }`  
**Auth**: SUPER_ADMIN only

---

## 15. Import / Export

### CV Upload (Individual)

**Endpoint**: `POST /api/upload/cv`  
**Auth**: Any authenticated user  
**Accepts**: PDF or DOCX (multipart/form-data)  
**Max size**: 5MB  
**Returns**: `ParsedCV` object  
**Side effect**: Updates profile with extracted data, triggers matching

### Logo / Image Upload

**Endpoint**: `POST /api/upload/logo` (employer logo)  
**Endpoint**: `POST /api/upload/ad-image` (advertisement image)  
**Storage**: Local filesystem (`/public/uploads/`) in dev; Railway volume in prod  
**Returns**: `{ url: string }`

### Application Export
Currently no CSV export of applications — identified as a v2 feature.

### Interview PDF Export
`GET /api/admin/interviews/pdf?id=` — downloads per-interview PDF.

---

## 16. Notifications

**Model**: `Notification` (userId, title, body, type, isRead, link)

**Bell component**: `NotificationBell` in TopBar — fetches `GET /api/notifications`, shows unread count badge, dropdown list, marks read on open.

**Mark read**: `POST /api/notifications/read` with `{ ids: string[] }`

**Types**: `APPLICATION_UPDATE | NEW_APPLICATION | INTERVIEW_SCHEDULED | SYSTEM | NUDGE`

**Created by**: API routes when key events happen (application status change, interview scheduled, nudge sent)

---

## 17. Audit Log

**Model**: `AuditLog` (userId, action, entity, entityId, detail, ipAddress)

**Logged actions**: CREATE, UPDATE, DELETE on Users, Jobs, JobBoards, Applications, LearnerProfiles, etc.

**View**: `/admin/audit` — paginated table, newest first. Columns: timestamp, user, action, entity, detail.

**API**: `GET /api/audit` (SUPER_ADMIN only), supports `?page=&limit=` pagination.

---

## 18. Analytics

All analytics are computed server-side from Prisma queries, no external analytics service.

### Admin Analytics (`/admin/analytics`)
- Total users by role (bar chart)
- Jobs by sector (pie chart)
- Applications by status (bar chart)
- Matches over time (line chart)
- New registrations over time (line chart)
- Top employers by job count

### Provider Analytics (`/provider/analytics`)
- Learner RAG status breakdown (pie)
- Milestone achievement rates (ms1/ms2/ms3)
- Profile completion histogram
- Job match score distribution

### Employer Analytics (`/employer/analytics`)
- Application funnel (APPLIED → HIRED)
- Applications per job

### Staff Analytics (`/staff/analytics`)
- Same as admin but read-only

### Overview Cards (per role)
All dashboards show KPI cards: totals for their key entities (learners, jobs, applications, matches, etc.)

---

## 19. Pagination Pattern

All list pages use server-side cursor/offset pagination:
- Default page size: **10 items**
- Query params: `?page=1&limit=10`
- API returns `{ data: [], total: number, page: number, totalPages: number }`
- UI renders prev/next buttons + "Page X of Y" text
- Tables use shadcn `Table` component

Example: `GET /api/admin/users?page=2&limit=10`

---

## 20. Messaging System

- Scoped to an **Application** (one thread per application)
- Both candidate and employer can send messages
- `GET /api/messages/[applicationId]` — fetch thread
- `POST /api/messages/[applicationId]` — send message
- UI: chat-bubble style, sender on right, recipient on left
- `isRead` flag per message; unread count shown in sidebar/notification bell

---

## 21. API Surface

### Auth
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/signup` | Public | Create JOB_SEEKER account |
| POST | `/api/auth/reset-password` | Authenticated | Change password |
| GET | `/api/auth/password-prompt` | Authenticated | Check mustChangePassword |

### Admin
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET/POST | `/api/admin/users` | SUPER_ADMIN | List/create users |
| GET/PATCH/DELETE | `/api/admin/users/[id]` | SUPER_ADMIN | Manage user |
| GET | `/api/admin/providers` | SUPER_ADMIN | List providers |
| PATCH | `/api/admin/providers/[id]/quota` | SUPER_ADMIN | Set learner quota override |
| GET | `/api/admin/employers` | SUPER_ADMIN | List employers |
| GET | `/api/admin/learners` | SUPER_ADMIN | All learners |
| POST | `/api/admin/learners/nudge` | SUPER_ADMIN | Send nudge to learner |
| GET | `/api/admin/interviews` | SUPER_ADMIN | All interviews |
| GET | `/api/admin/interviews/pdf` | SUPER_ADMIN | Download PDF |
| POST | `/api/admin/impersonate` | SUPER_ADMIN | Impersonate user |
| GET/POST | `/api/admin/ads` | SUPER_ADMIN | List/create ads |
| PATCH/DELETE | `/api/admin/ads/[id]` | SUPER_ADMIN | Manage ad |

### Jobs
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET/POST | `/api/jobs` | Various | List/create jobs |
| GET/PATCH/DELETE | `/api/jobs/[id]` | Various | Manage job |
| POST | `/api/jobs/bulk-delete` | SUPER_ADMIN | Bulk delete |

### Candidates
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/api/candidates` | Staff/Admin | List all candidates |
| GET/PATCH | `/api/candidates/profile` | LEARNER/JOB_SEEKER | Own profile |
| POST | `/api/candidates/experience` | LEARNER/JOB_SEEKER | Add experience |
| POST | `/api/candidates/education` | LEARNER/JOB_SEEKER | Add education |
| POST | `/api/candidates/certificates` | LEARNER/JOB_SEEKER | Add certificate |

### Providers
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET/POST | `/api/providers/courses` | TRAINING_PROVIDER | Courses CRUD |
| GET/POST | `/api/providers/cohorts` | TRAINING_PROVIDER | Cohorts CRUD |
| GET | `/api/providers/learners` | TRAINING_PROVIDER | Own learners |
| GET/PATCH | `/api/providers/learners/[id]` | TRAINING_PROVIDER | Update learner |
| POST | `/api/providers/learners/nudge` | TRAINING_PROVIDER | Nudge learner |
| POST | `/api/providers/learners/notify` | TRAINING_PROVIDER | Bulk notify |
| POST | `/api/providers/learners/credentials` | TRAINING_PROVIDER | Resend credentials |
| POST | `/api/providers/learners/bulk` | TRAINING_PROVIDER | CSV bulk upload |

### Applications & Interviews
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET/POST | `/api/applications` | Various | List/create applications |
| GET/PATCH | `/api/applications/[id]` | Various | Update application status |
| GET/POST | `/api/interviews` | EMPLOYER | Schedule/list interviews |
| GET/PATCH | `/api/interviews/[id]` | EMPLOYER | Confirm/update interview |

### Matching & Scraper
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/api/matching/run-candidate/[id]` | Staff/Admin | Run for one candidate |
| POST | `/api/matching/run-job/[id]` | Staff/Admin | Run for one job |
| POST | `/api/matching/run-all` | SUPER_ADMIN | Global matching run |
| GET/POST | `/api/scraper/boards` | Staff/Admin | List/create boards |
| GET/PATCH/DELETE | `/api/scraper/boards/[id]` | SUPER_ADMIN | Manage board |
| POST | `/api/scraper/run/[boardId]` | SUPER_ADMIN | Run board now |
| POST | `/api/scraper/preview-rss` | SUPER_ADMIN | Preview RSS feed |
| GET | `/api/scraper/cron` | `CRON_SECRET` | Scheduled runner |
| POST | `/api/scraper/seed-uk` | SUPER_ADMIN | Seed 50 UK jobs |

### Other
| Method | Path | Role | Purpose |
|--------|------|------|---------|
| GET | `/api/analytics/overview` | Various | Dashboard KPIs |
| GET | `/api/notifications` | Authenticated | Own notifications |
| POST | `/api/notifications/read` | Authenticated | Mark read |
| GET | `/api/audit` | SUPER_ADMIN | Audit log |
| GET/PATCH | `/api/settings` | SUPER_ADMIN | System settings |
| GET | `/api/ads/active` | Any | Active ads for display |
| GET/POST | `/api/provider/ads` | TRAINING_PROVIDER | Provider ads |
| PATCH/DELETE | `/api/provider/ads/[id]` | TRAINING_PROVIDER | Manage ad |
| POST | `/api/upload/cv` | Authenticated | Upload + parse CV |
| POST | `/api/upload/cv-bulk` | TRAINING_PROVIDER | Bulk CV ZIP upload |
| POST | `/api/upload/logo` | EMPLOYER | Upload company logo |
| POST | `/api/upload/ad-image` | Admin/Provider | Upload ad image |
| GET/POST | `/api/messages/[applicationId]` | Various | Thread CRUD |
| GET/PATCH | `/api/employers/profile` | EMPLOYER | Company profile |

---

## 22. Environment Variables

```env
# Database (required)
DATABASE_URL=file:/data/prod.db          # Railway production path
DATABASE_URL=file:./prisma/dev.db        # Local dev path

# Auth (required)
NEXTAUTH_SECRET=<32+ char random string>
NEXTAUTH_URL=https://your-domain.up.railway.app
AUTH_TRUST_HOST=true                     # Required in production

# Email (optional – platform works without it)
RESEND_API_KEY=re_xxxx
EMAIL_FROM=EdvanceFE <noreply@edvancefe.com>

# Deployment
SEED_ON_DEPLOY=true    # Set once to seed demo data, then remove
PORT=8080              # Injected by Railway automatically
```

---

## 23. Deployment

### railway.toml
```toml
[deploy]
startCommand = "npx prisma migrate deploy && ([ \"$SEED_ON_DEPLOY\" = \"true\" ] && npx prisma db seed || true) && npx next start -p ${PORT:-3000}"
```

### Migrations
Stored in `prisma/migrations/`. Three migrations:
1. Initial schema
2. Phase 3/4 additions
3. `20260613000000_phase6_schema` — adds `lastLoginAt`, `mustChangePassword`, `learnerQuotaOverride`, `Advertisement` table, extra `JobBoard` columns

### One-Time Seeding
Set `SEED_ON_DEPLOY=true` in Railway Variables → deploy → remove the variable after success.

---

## 24. Demo Accounts

| Role | Email | Password | Name |
|------|-------|----------|------|
| SUPER_ADMIN | admin@edvancefe.com | Admin@1234 | System Admin |
| INTERNAL_STAFF | staff@edvancefe.com | Staff@1234 | Sarah Johnson |
| TRAINING_PROVIDER | provider@codeinstitute.com | Provider@1234 | James Wilson |
| EMPLOYER | employer@techcorp.com | Employer@1234 | Emma Davies |
| LEARNER | learner@edvancefe.com | Learner@1234 | Alex Thompson |
| JOB_SEEKER | seeker@edvancefe.com | Seeker@1234 | Maria Garcia |

Additional seeded learners (same password `Learner@1234`):
- `learner2@edvancefe.com` — Ben Carter (AMBER RAG)
- `learner3@edvancefe.com` — Claire Donovan (RED RAG)

---

## 25. File Structure (Key Files)

```
ed_fe/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Sidebar + main layout wrapper
│   │   ├── reset-password/page.tsx ← mustChangePassword gate
│   │   ├── admin/                  ← 14 pages
│   │   ├── staff/                  ← 6 pages
│   │   ├── provider/               ← 8 pages
│   │   ├── employer/               ← 7 pages
│   │   ├── learner/                ← 5 pages
│   │   └── jobseeker/              ← 5 pages
│   └── api/                        ← ~60 route handlers
├── components/
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── shared/
│       ├── NotificationBell.tsx
│       ├── AdBanner.tsx
│       ├── CVUpload.tsx
│       └── ProfileCompletionBar.tsx
├── lib/
│   ├── auth.ts                     ← NextAuth config
│   ├── prisma.ts                   ← Prisma singleton
│   ├── cv-parser.ts                ← PDF/DOCX parser
│   ├── matching.ts                 ← Job matching algorithm
│   ├── email.ts                    ← Resend wrapper
│   ├── quota.ts                    ← Provider quota logic
│   └── utils.ts                    ← cn() helper
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── middleware.ts                    ← Route guards
├── tailwind.config.ts
├── railway.toml
└── .env.example
```

---

## 26. Known Gaps / V2 Opportunities

1. **REED / Adzuna API integration** — board type exists, REST ingestion not implemented (only RSS/generic)
2. **CSV export** — no export of learners, jobs, or applications to CSV/Excel
3. **Real-time messaging** — currently polling; upgrade to WebSockets/SSE
4. **Scanned PDF support** — cv-parser cannot handle image-based PDFs; needs OCR (Tesseract)
5. **Role-level signup approval** — employer/provider accounts created by admin only; no self-serve approval flow
6. **Two-factor authentication** — not implemented
7. **Provider billing** — `monthlyFee` and `billingStatus` stored but no Stripe integration
8. **Mobile app** — responsive sidebar exists but no dedicated mobile experience
9. **Calendar view for interviews** — currently list-only
10. **AI-powered job description generation** — could use Claude API from employer job posting
11. **Weighted skill demand** — matching treats all skills equally; could weight by job sector importance
12. **Multi-provider learner visibility** — a learner currently belongs to exactly one provider
13. **Offer letter PDF generation** — only interview confirmations are PDF-exported today

---

*Generated: 2026-07-06 | Version: Phase 6 complete*
