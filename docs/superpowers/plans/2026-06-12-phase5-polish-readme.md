# Phase 5: Polish, README & Final Verification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Final polish pass — fix UI issues, write comprehensive README with setup instructions, create .env.example, and verify the master prompt's final checklist passes.

**Architecture:** No new features. This phase fixes gaps between what the master prompt specifies and what's currently built, writes documentation, and runs the final verification checklist.

**Tech Stack:** Next.js 14, Prisma 6, Tailwind CSS, Recharts, Lucide React

---

### Task 1: Fix Admin Providers Page — Remove Non-Existent `ukprn` Field

**Files:**
- Modify: `app/(dashboard)/admin/providers/page.tsx`

The `ukprn` column references a field that doesn't exist in the Prisma schema (`ProviderProfile` has no `ukprn` field). This causes the column to render empty.

- [ ] **Step 1: Remove ukprn column from the providers table**

In `app/(dashboard)/admin/providers/page.tsx`, remove the `ukprn` column from the `columns` array and the `ukprn` field from the `Provider` interface:

```tsx
// Remove from interface:
//   ukprn: string

// Remove from columns array:
//   { key: "ukprn", label: "UKPRN", sortable: true },
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/(dashboard)/admin/providers/page.tsx
git commit -m "fix: remove non-existent ukprn field from admin providers page"
```

---

### Task 2: Create `.env.example`

**Files:**
- Create: `.env.example`

The master prompt requires a `.env.example` file so new developers can copy it.

- [ ] **Step 1: Create `.env.example`**

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
REED_API_KEY=""
ADZUNA_APP_ID=""
ADZUNA_APP_KEY=""
RESEND_API_KEY=""
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add .env.example with all required environment variables"
```

---

### Task 3: Write Comprehensive README

**Files:**
- Modify: `README.md`

Replace the default Next.js README with project-specific documentation covering: overview, tech stack, setup instructions, seed credentials, project structure, and feature summary.

- [ ] **Step 1: Write the README**

The README must include:
1. Project title and one-line description
2. Tech stack list
3. Setup instructions (clone, install, env, prisma generate, migrate, seed, dev)
4. Seed login credentials table (all 6 roles)
5. Project structure overview
6. Feature summary per role
7. Key architectural decisions (RLS, sector lock, matching engine weights)

```markdown
# EdvanceFE

A full-stack Outcome Management System (OMS) and job matching platform for UK funded skills provision. Serves 6 distinct user roles with isolated dashboards, role-based access, a skills-based matching engine, and multi-source job scraping.

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Prisma 6 + SQLite (swap to Postgres via DATABASE_URL)
- **Auth:** NextAuth.js v5 (credentials provider, JWT sessions)
- **Styling:** Tailwind CSS + shadcn/ui-style components
- **Charts:** Recharts
- **Icons:** Lucide React
- **CV Parsing:** pdf-parse (PDF), mammoth (DOC/DOCX)
- **Job Scraping:** Reed API, Adzuna API, RSS (fast-xml-parser), Generic URL
- **Password Hashing:** bcryptjs

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Generate Prisma client
npx prisma generate

# Create database and run migrations
npx prisma migrate dev --name init

# Seed with test data
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with any credential below.

## Seed Credentials

| Role              | Email                          | Password       |
|-------------------|--------------------------------|----------------|
| Super Admin       | admin@edvancefe.com            | Admin@1234     |
| Internal Staff    | staff@edvancefe.com            | Staff@1234     |
| Training Provider | provider@codeinstitute.com     | Provider@1234  |
| Employer          | employer@techcorp.com          | Employer@1234  |
| Learner           | learner@edvancefe.com          | Learner@1234   |
| Job Seeker        | seeker@edvancefe.com           | Seeker@1234    |

## Project Structure

```
app/
  (auth)/           Login and signup pages
  (dashboard)/
    admin/          Super Admin dashboard (11 pages)
    staff/          Internal Staff dashboard (7 pages)
    provider/       Training Provider dashboard (7 pages)
    employer/       Employer dashboard (10 pages)
    learner/        Learner dashboard (7 pages)
    jobseeker/      Job Seeker dashboard (7 pages)
  api/              API routes (role-scoped, RLS enforced)
components/
  ui/               shadcn-style primitives (Button, Card, Input, etc.)
  dashboard/        Sidebar, TopBar, StatCard
  shared/           DataTable, ProfileProgress, MatchBadge, NotificationBell
  messaging/        MessageThread
  interviews/       InterviewScheduler
  candidates/       CVUpload
lib/
  auth.ts           NextAuth v5 configuration
  prisma.ts         Prisma client singleton
  matching.ts       5-dimension matching engine
  cv-parser.ts      PDF/DOCX CV extraction
  scraper/          Reed, Adzuna, RSS, Generic URL scrapers
prisma/
  schema.prisma     18 models
  seed.ts           Test data (6 users, 10 jobs, matches, applications)
middleware.ts       Role-based route protection
```

## Features by Role

### Super Admin
- Platform overview with stat cards and recent audit activity
- Manage providers, employers, users (activate/deactivate)
- View all jobs, messages (read-only), audit log
- Job scraper management (Reed, Adzuna, RSS, Generic URL)
- Matching engine settings (threshold, re-run all)
- System settings, platform analytics with charts

### Internal Staff
- Candidate management (all job seekers + learners)
- Job listing with per-job matching trigger
- Application pipeline board (kanban-style, 6 stages)
- Run matching engine, view analytics

### Training Provider
- Learner management with RAG status tracking (Green/Amber/Red)
- Course and cohort management
- Milestone tracking (MS1/MS2/MS3)
- Bulk CV upload with auto-parsing
- Credential generation and CSV download
- Read-only view of learner message threads
- Analytics: RAG distribution, milestone funnel

### Employer
- Company profile builder
- Job posting with skills tagging and sector selection
- Application management with shortlist/reject actions
- Messaging with candidates
- Interview scheduling (propose slots, candidate confirms)
- Analytics: application status breakdown

### Learner
- Sector-locked job feed (only sees jobs matching course sector)
- Full profile builder with CV upload
- Application tracking with messaging
- Milestone progress display

### Job Seeker
- Full job board (all sectors, no restrictions)
- Profile builder with CV upload and auto-parsing
- Match % displayed on job cards
- Application tracking with messaging

## Matching Engine

5-dimension scoring algorithm (max 100 points):

| Dimension  | Weight | Method                              |
|------------|--------|-------------------------------------|
| Skills     | 50 pts | Keyword overlap between candidate and job |
| Sector     | 20 pts | Exact sector match                  |
| Location   | 15 pts | City/region match                   |
| Seniority  | 10 pts | Experience level alignment          |
| Title      | 5 pts  | Job title keyword similarity        |

Minimum threshold configurable via System Settings (default: 40).

## Key Architecture Decisions

- **RLS at API level:** Every API route filters by authenticated user's scope. Provider routes filter by `providerId`, employer routes by `employerId`.
- **Sector lock for learners:** Job queries for learners always include `WHERE sector = learner.courseSector`.
- **Learner vs Job Seeker separation:** Completely separate route groups, components, and navigation. No shared page components.
- **Scraped job behaviour:** Internal jobs show inline Apply form. External jobs (Reed/Adzuna/RSS) link to the source.
- **Audit logging:** Every create, update, delete action writes to the AuditLog table.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: write comprehensive README with setup instructions and feature docs"
```

---

### Task 4: Run Master Prompt Final Checklist

**Files:** None (verification only)

Run through every item in the master prompt's "Final Checklist Before Considering Complete" section. This is a manual verification — check each item and fix any failures inline.

- [ ] **Step 1: Verify build passes clean**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds with all routes compiled

- [ ] **Step 2: Run through checklist items**

For each item, verify by reading the relevant code:

1. **All 6 role dashboards render without errors** — confirmed by build passing (all 67 routes compile)
2. **Login and signup work for all public roles** — `app/(auth)/login/page.tsx` and `app/(auth)/signup/page.tsx` exist with role selector
3. **Learner and Job Seeker dashboards are visually and functionally distinct** — separate route groups, separate pages, separate sidebar nav
4. **Sector lock working** — check `app/api/jobs/route.ts` contains `WHERE sector = learner.courseSector` filter
5. **CV upload parses PDF and DOCX** — `lib/cv-parser.ts` uses pdf-parse + mammoth
6. **Bulk CV upload** — `app/api/upload/cv-bulk/route.ts` exists
7. **Matching engine runs and stores results** — `lib/matching.ts` with `calculateMatchScore`, `runMatchingForCandidate`, `runMatchingForJob`, `runAllMatching`
8. **Match % shows on job cards** — check learner/jobseeker job pages for MatchBadge
9. **Employer can post a job and see matched candidates** — `app/(dashboard)/employer/jobs/new/page.tsx` and `app/(dashboard)/employer/jobs/[id]/page.tsx`
10. **Messaging works** — `components/messaging/MessageThread.tsx` with 10s polling
11. **Provider sees learner message threads (read only)** — `app/(dashboard)/provider/messages/page.tsx`
12. **Interview scheduler works** — `components/interviews/InterviewScheduler.tsx`
13. **Scraper admin page shows all 4 board types** — `app/(dashboard)/admin/scraper/page.tsx` with RSS/REED/ADZUNA/GENERIC select
14. **RSS field mapping UI** — NOT YET BUILT (see Task 5)
15. **All charts render with seed data** — Recharts in admin/staff/provider/employer analytics pages
16. **Export CSV works on at least one table** — `components/shared/DataTable.tsx` has CSV export
17. **Notification bell shows unread count** — `components/shared/NotificationBell.tsx`
18. **Audit log records actions** — `app/api/audit/route.ts` + audit logging in user/settings/application routes
19. **RLS enforced at API level** — provider routes filter by providerId, employer by employerId
20. **No emojis anywhere in UI** — Lucide React icons only
21. **All icons from Lucide React** — confirmed
22. **#5B4FE8 applied consistently** — defined as `primary` in tailwind.config.ts
23. **README with setup instructions** — Task 3 covers this

- [ ] **Step 3: Note any failures for immediate fixing**

Expected failures to fix:
- Item 14: RSS field mapping UI not built — covered in Task 5
- Any other gaps found during verification

---

### Task 5: Build RSS Field Mapping UI (Missing Feature)

**Files:**
- Create: `app/(dashboard)/admin/scraper/[id]/mapping/page.tsx`

The master prompt specifies an RSS field mapping page where admins can map RSS feed fields to platform fields. This was not built in Phase 4.

- [ ] **Step 1: Create the RSS field mapping page**

Build a page at `app/(dashboard)/admin/scraper/[id]/mapping/page.tsx` that:
1. Fetches the job board by ID
2. Fetches a sample of the RSS feed to detect available fields
3. Shows a mapping UI: left column = RSS fields detected, right column = dropdown of platform fields (`title`, `company`, `location`, `sector`, `salaryMin`, `salaryMax`, `description`, `sourceUrl`, `deadline`, `jobType`)
4. Shows a preview card using current mappings
5. Saves mappings as JSON to `JobBoard.fieldMappings`

```tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Save, Eye, RefreshCw } from "lucide-react"

const PLATFORM_FIELDS = [
  "", "title", "company", "location", "sector", "salaryMin", "salaryMax",
  "description", "sourceUrl", "deadline", "jobType"
]

interface Board {
  id: string
  name: string
  boardType: string
  feedUrl: string
  fieldMappings: string
}

export default function RSSFieldMappingPage() {
  const { id } = useParams()
  const router = useRouter()
  const [board, setBoard] = useState<Board | null>(null)
  const [rssFields, setRssFields] = useState<string[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [sampleItem, setSampleItem] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [customField, setCustomField] = useState("")

  useEffect(() => {
    fetch(`/api/scraper/boards/${id}`).then(r => r.json()).then(b => {
      setBoard(b)
      const existing = b.fieldMappings ? JSON.parse(b.fieldMappings) : {}
      setMappings(existing)
      if (b.feedUrl && b.boardType === "RSS") {
        fetch(`/api/scraper/preview-rss?url=${encodeURIComponent(b.feedUrl)}`)
          .then(r => r.json())
          .then(data => {
            setRssFields(data.fields || [])
            setSampleItem(data.sample || null)
            setLoading(false)
          })
          .catch(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
  }, [id])

  const updateMapping = (rssField: string, platformField: string) => {
    setMappings(prev => ({ ...prev, [rssField]: platformField }))
  }

  const addCustomField = () => {
    if (customField.trim() && !PLATFORM_FIELDS.includes(customField.trim())) {
      PLATFORM_FIELDS.push(customField.trim())
      setCustomField("")
    }
  }

  const save = async () => {
    setSaving(true)
    await fetch(`/api/scraper/boards/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldMappings: JSON.stringify(mappings) }),
    })
    setSaving(false)
    router.push("/admin/scraper")
  }

  const previewJob = () => {
    if (!sampleItem) return null
    const mapped: Record<string, string> = {}
    for (const [rssField, platformField] of Object.entries(mappings)) {
      if (platformField && sampleItem[rssField]) {
        mapped[platformField] = sampleItem[rssField]
      }
    }
    return mapped
  }

  if (loading) return <><TopBar title="Field Mapping" /><div className="p-6 text-gray-500">Loading feed...</div></>
  if (!board) return <><TopBar title="Field Mapping" /><div className="p-6 text-red-500">Board not found.</div></>

  const preview = previewJob()

  return (
    <>
      <TopBar title={`Field Mapping: ${board.name}`} />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>Map RSS Fields to Platform Fields</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rssFields.length === 0 ? (
              <p className="text-sm text-gray-500">No fields detected. Make sure the feed URL is valid and returns RSS/Atom XML.</p>
            ) : (
              rssFields.map(field => (
                <div key={field} className="flex items-center gap-4">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded min-w-[180px]">{field}</code>
                  <span className="text-gray-400">→</span>
                  <Select
                    value={mappings[field] || ""}
                    onChange={e => updateMapping(field, e.target.value)}
                    className="flex-1"
                  >
                    {PLATFORM_FIELDS.map(pf => (
                      <option key={pf} value={pf}>{pf || "(unmapped)"}</option>
                    ))}
                  </Select>
                </div>
              ))
            )}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Input
                placeholder="Add custom field name"
                value={customField}
                onChange={e => setCustomField(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={addCustomField}>Add Field</Button>
            </div>
          </CardContent>
        </Card>

        {sampleItem && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  <Eye className="h-4 w-4 mr-1" />{showPreview ? "Hide" : "Show"} Preview
                </Button>
              </div>
            </CardHeader>
            {showPreview && preview && (
              <CardContent>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <p className="font-semibold text-lg text-[#1A1A2E]">{preview.title || "(no title mapped)"}</p>
                  <p className="text-sm text-gray-600">{preview.company || "(no company)"} — {preview.location || "(no location)"}</p>
                  {preview.sector && <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">{preview.sector}</span>}
                  {(preview.salaryMin || preview.salaryMax) && (
                    <p className="text-sm text-gray-500">Salary: {preview.salaryMin || "?"} - {preview.salaryMax || "?"}</p>
                  )}
                  {preview.description && <p className="text-sm text-gray-500 line-clamp-3">{preview.description}</p>}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        <div className="flex gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Mappings
          </Button>
          <Button variant="outline" onClick={() => router.push("/admin/scraper")}>Cancel</Button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create the preview-rss API route**

Create `app/api/scraper/preview-rss/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const feedUrl = searchParams.get("url")
  if (!feedUrl) return NextResponse.json({ error: "URL required" }, { status: 400 })

  try {
    const { XMLParser } = require("fast-xml-parser")
    const response = await fetch(feedUrl)
    const xml = await response.text()
    const parser = new XMLParser({ ignoreAttributes: false })
    const result = parser.parse(xml)
    const items = result?.rss?.channel?.item || result?.feed?.entry || []
    const itemArray = Array.isArray(items) ? items : [items]
    const sample = itemArray[0] || {}
    const fields = Object.keys(sample).filter(k => typeof sample[k] === "string" || typeof sample[k] === "number")

    return NextResponse.json({ fields, sample })
  } catch {
    return NextResponse.json({ fields: [], sample: null, error: "Failed to parse feed" })
  }
}
```

- [ ] **Step 3: Add "Map Fields" button to scraper page**

In `app/(dashboard)/admin/scraper/page.tsx`, add a button for RSS boards that links to the mapping page:

```tsx
// Inside the board card actions, add before the run button:
{board.type === "RSS" && (
  <Button size="sm" variant="outline" onClick={() => window.location.href = `/admin/scraper/${board.id}/mapping`}>
    Map Fields
  </Button>
)}
```

- [ ] **Step 4: Verify build passes**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add app/(dashboard)/admin/scraper/ app/api/scraper/preview-rss/
git commit -m "feat: add RSS field mapping UI for job scraper"
```

---

### Task 6: Polish — Fix Minor UI Gaps

**Files:**
- Modify: `app/(dashboard)/admin/scraper/page.tsx` (add "Map Fields" link from Task 5)
- Modify: `app/(dashboard)/admin/providers/page.tsx` (remove ukprn from Task 1)

This task covers any small UI fixes found during verification.

- [ ] **Step 1: Ensure admin overview uses correct stat for recent activity verb tense**

In `app/(dashboard)/admin/page.tsx`, the audit log renders `{log.action.toLowerCase()}d` which produces "created", "updated", "deleted" — but also "logind" for LOGIN actions. Fix the verb:

```tsx
// Replace:
{log.user?.name || "System"} {log.action.toLowerCase()}d {log.entity}

// With:
{log.user?.name || "System"} — {log.action} {log.entity}
```

- [ ] **Step 2: Commit**

```bash
git add app/(dashboard)/admin/page.tsx
git commit -m "fix: correct audit log verb display on admin overview"
```

---

### Task 7: Final Build Verification and Commit

**Files:** None

- [ ] **Step 1: Clean build**

Run: `Remove-Item -Recurse -Force .next; npx next build 2>&1 | tail -20`
Expected: Build succeeds, all routes compiled, no TypeScript errors

- [ ] **Step 2: Re-seed database**

Run: `npx prisma db seed`
Expected: "Seed completed successfully" with all 6 credentials listed

- [ ] **Step 3: Create final Phase 5 commit**

```bash
git add -A
git commit -m "Phase 5: Polish, README, RSS field mapping, final verification"
```

- [ ] **Step 4: Verify final route count**

Run: `npx next build 2>&1 | grep -c "├\|└"`
Expected: 69+ routes (67 from Phase 4 + 2 new: RSS mapping page + preview-rss API)
