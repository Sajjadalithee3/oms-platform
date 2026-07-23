# Desired Sector, Salary Bands & Sector-Fallback Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free-text "Desired Role" with an admin-managed, multi-select "Desired Sector" (max 5), replace free-number salary with 3 capped bands, add an Employment Type preference, and rework job matching so sector match carries real weight when skills don't overlap.

**Architecture:** A new `Sector` lookup table backs an admin-managed taxonomy. `desiredRoles` is renamed to `desiredSectors` on both `LearnerProfile` and `JobSeekerProfile` (same JSON-array-of-strings shape, new meaning). The matching engine's candidate pre-filter and weighted scoring both move from the old single-value `courseSector` to the new multi-value `desiredSectors`.

**Tech Stack:** Next.js App Router, Prisma 6 + PostgreSQL (Neon), existing shadcn-style UI components in `components/ui/`, `lib/matching.ts` scoring engine.

## Global Constraints

- This project has **no existing test framework** (no Jest/Vitest config, no `test` script in `package.json`). Verification steps in this plan use `npx tsc --noEmit` for type safety and manual curl/browser checks with exact expected output, matching how prior work in this codebase has been verified — do not introduce a new test framework as part of this plan.
- This project deploys via `npx prisma db push` (see `vercel.json`), **not** `prisma migrate`. There is no `prisma/migrations` folder. All schema changes in this plan are applied via `db push`, never a hand-written SQL migration file.
- Salary bands (exact wording, use verbatim in the UI): "Under £25,000", "£25,000 – £35,000", "£35,000 – £50,000".
- Sector seed list (exact names, case-sensitive): `Health Care`, `Digital Support`, `Information Technology`, `Technical`, `AI`, `Non Technical`.
- Max 5 sectors selectable per candidate (Learner or Job Seeker) — enforced in the UI with an inline message, not a hard-disabled control.
- Employment Type values: `FULL_TIME`, `PART_TIME`, `BOTH` — stored only, not scored in matching (matches the existing unscored `remotePreference` field precedent).

---

### Task 1: Sector data model + admin management

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `app/api/sectors/route.ts`
- Create: `app/api/admin/sectors/route.ts`
- Create: `app/api/admin/sectors/[id]/route.ts`
- Create: `app/(dashboard)/admin/sectors/page.tsx`
- Modify: `components/dashboard/Sidebar.tsx:21-36` (add "Sectors" nav item under `SUPER_ADMIN`)

**Interfaces:**
- Produces: `GET /api/sectors` → `Sector[]` where `isActive: true`, shape `{ id: string, name: string, isActive: boolean, createdAt: string }[]`. Consumed by Task 3's profile pages.
- Produces: `prisma.sector` model, used by Task 3's dropdown population.

- [ ] **Step 1: Add the `Sector` model to the schema**

Open `prisma/schema.prisma` and add this model anywhere after the `Notification` model (around line 373, before `Advertisement`):

```prisma
model Sector {
  id        String   @id @default(cuid())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Push the schema and generate the client**

```bash
npx prisma db push
npx prisma generate
```

Expected: `db push` reports the new `Sector` table created; `generate` reports the client regenerated with no errors.

- [ ] **Step 3: Create the public sectors-list API route**

Create `app/api/sectors/route.ts`:

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sectors = await prisma.sector.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(sectors)
}
```

- [ ] **Step 4: Create the admin sectors CRUD routes**

Create `app/api/admin/sectors/route.ts`:

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const sectors = await prisma.sector.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(sectors)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const name = String(body.name || "").trim()
  if (!name) return NextResponse.json({ error: "Sector name is required" }, { status: 400 })

  const existing = await prisma.sector.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  })
  if (existing) return NextResponse.json({ error: "A sector with this name already exists" }, { status: 409 })

  const sector = await prisma.sector.create({ data: { name } })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "CREATE", entity: "Sector", entityId: sector.id, detail: `Sector "${name}" added` },
  })

  return NextResponse.json(sector, { status: 201 })
}
```

Create `app/api/admin/sectors/[id]/route.ts`:

```ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await request.json()
  const sector = await prisma.sector.update({
    where: { id: params.id },
    data: { isActive: Boolean(body.isActive) },
  })

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "UPDATE", entity: "Sector", entityId: sector.id, detail: `Sector "${sector.name}" ${sector.isActive ? "activated" : "deactivated"}` },
  })

  return NextResponse.json(sector)
}
```

- [ ] **Step 5: Create the admin sectors management page**

Create `app/(dashboard)/admin/sectors/page.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { TopBar } from "@/components/dashboard/TopBar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"

interface Sector {
  id: string
  name: string
  isActive: boolean
}

export default function AdminSectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchSectors = () => {
    fetch("/api/admin/sectors").then((r) => r.json()).then((d) => { setSectors(d); setLoading(false) })
  }

  useEffect(() => { fetchSectors() }, [])

  async function addSector() {
    setError("")
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    const res = await fetch("/api/admin/sectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    })
    if (res.ok) {
      setName("")
      fetchSectors()
    } else {
      const data = await res.json()
      setError(data.error || "Failed to add sector")
    }
    setSaving(false)
  }

  async function toggleActive(sector: Sector) {
    await fetch(`/api/admin/sectors/${sector.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !sector.isActive }),
    })
    fetchSectors()
  }

  if (loading) return <><TopBar title="Sectors" /><div className="p-6 text-gray-500">Loading...</div></>

  return (
    <>
      <TopBar title="Sectors" />
      <div className="p-6 space-y-6 max-w-2xl">
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Add Sector</p>
            <div className="flex gap-2">
              <Input placeholder="e.g. Health Care" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSector()} />
              <Button onClick={addSector} disabled={saving}><Plus className="h-4 w-4 mr-2" />Add</Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>

        <div className="space-y-2">
          {sectors.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{s.name}</span>
                  <Badge className={s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => toggleActive(s)}>
                  {s.isActive ? "Deactivate" : "Activate"}
                </Button>
              </CardContent>
            </Card>
          ))}
          {sectors.length === 0 && <p className="text-sm text-gray-500 text-center py-8">No sectors yet. Add one above.</p>}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 6: Add the sidebar nav item**

In `components/dashboard/Sidebar.tsx`, the icon import block is at lines 8-12:

```tsx
import {
  LayoutDashboard, Users, Briefcase, Settings, BarChart3, FileText, MessageSquare,
  Building2, GraduationCap, UserCheck, ClipboardList, Search, Target,
  BookOpen, FolderOpen, Shield, LogOut, Menu, X, Megaphone
} from "lucide-react"
```

`Tag` is not in this list — add it:

```tsx
import {
  LayoutDashboard, Users, Briefcase, Settings, BarChart3, FileText, MessageSquare,
  Building2, GraduationCap, UserCheck, ClipboardList, Search, Target,
  BookOpen, FolderOpen, Shield, LogOut, Menu, X, Megaphone, Tag
} from "lucide-react"
```

The `SUPER_ADMIN` array starts at line 21. Insert a new entry right after `"Users"` (line 27) so it sits near other admin-management items:

```tsx
    { label: "Users", href: "/admin/users", icon: <Users className="h-5 w-5" /> },
    { label: "Sectors", href: "/admin/sectors", icon: <Tag className="h-5 w-5" /> },
```

- [ ] **Step 7: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

Manually: log in as `admin@edvancefe.com`, visit `/admin/sectors`, add "Health Care", confirm it appears with an "Active" badge, click "Deactivate", confirm the badge flips to "Inactive". Then re-activate it (repeat toggle) since Task 3 needs it active for testing.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma app/api/sectors app/api/admin/sectors "app/(dashboard)/admin/sectors" components/dashboard/Sidebar.tsx
git commit -m "feat: add Sector model and admin sector management"
```

---

### Task 2: Rename desiredRoles → desiredSectors, add employmentType, update matching engine

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Modify: `lib/profile-completion.ts`
- Modify: `app/api/candidates/profile/route.ts`
- Modify: `lib/matching.ts`

**Interfaces:**
- Consumes: `prisma.sector` (Task 1) — only via the seed script listing the same 6 names, no runtime dependency.
- Produces: `PUT /api/candidates/profile` now accepts `desiredSectors: string[]` and `employmentType: string` in its body instead of `desiredRoles`. Consumed by Task 3's profile pages.
- Produces: `CandidateProfile.desiredSectors` field in `lib/matching.ts`, replacing `desiredRoles`/`courseSector`.

- [ ] **Step 1: Update the schema — rename field, add employmentType, on both profile models**

In `prisma/schema.prisma`, `JobSeekerProfile` (around line 72):

```prisma
  skills            String    @default("[]")
  desiredSectors    String    @default("[]")
  employmentType    String?
  desiredSalaryMin  Int?
```

(replacing the existing `desiredRoles String @default("[]")` line with `desiredSectors` and inserting `employmentType String?` after it)

In `prisma/schema.prisma`, `LearnerProfile` (around line 106):

```prisma
  skills            String    @default("[]")
  desiredSectors    String    @default("[]")
  employmentType    String?
  desiredSalaryMin  Int?
```

(same replacement)

- [ ] **Step 2: Push the schema**

```bash
npx prisma db push
npx prisma generate
```

Expected: `db push` reports it renamed/altered the columns (Prisma will detect this as a column rename if run interactively, or as drop+add — either is fine since this is a rename with accepted data loss per the spec's migration note). If prompted about data loss, confirm — this is expected and documented.

- [ ] **Step 3: Update the seed script**

In `prisma/seed.ts`, every `desiredRoles: JSON.stringify([...])` call becomes `desiredSectors: JSON.stringify([...])` with sector names instead of role titles. There are 4 occurrences (learner1, learner2, learner3, jobSeeker). Update each:

Line 139 (`learner1`): change
```ts
      desiredRoles: JSON.stringify(["Care Worker", "Healthcare Assistant"]),
```
to
```ts
      desiredSectors: JSON.stringify(["Health Care"]),
```

Line 169 (`learner2`): change
```ts
      desiredRoles: JSON.stringify(["Support Worker"]),
```
to
```ts
      desiredSectors: JSON.stringify(["Health Care"]),
```

Line 201 (`learner3`): change
```ts
      desiredRoles: JSON.stringify(["Healthcare Assistant", "Care Coordinator"]),
```
to
```ts
      desiredSectors: JSON.stringify(["Health Care"]),
```

Line 221 (`jobSeeker`): change
```ts
      desiredRoles: JSON.stringify(["Full Stack Developer", "Frontend Developer"]),
```
to
```ts
      desiredSectors: JSON.stringify(["Information Technology"]),
```

Also add sector seeding. Insert this block right after the `provider` and `employer` creation (after line 106, before the `course` creation on line 108):

```ts
  const sectorNames = ["Health Care", "Digital Support", "Information Technology", "Technical", "AI", "Non Technical"]
  await prisma.sector.createMany({
    data: sectorNames.map((name) => ({ name })),
  })
```

- [ ] **Step 4: Update `lib/profile-completion.ts`**

Replace both occurrences (one in `JobSeekerFields`, one in `LearnerFields`) of:

```ts
  desiredRoles?: string | null
```

with:

```ts
  desiredSectors?: string | null
```

And both occurrences of the Preferences section's `filled` check:

```ts
      filled: !!(hasItems(profile.desiredRoles) && profile.desiredLocation),
```

with:

```ts
      filled: !!(hasItems(profile.desiredSectors) && profile.desiredLocation),
```

- [ ] **Step 5: Update `app/api/candidates/profile/route.ts`**

In the `JOB_SEEKER` branch of `PUT` (around line 46):

```ts
    const { headline, bio, phone, location, skills, desiredSectors, employmentType, desiredSalaryMin, desiredSalaryMax, desiredLocation, remotePreference, linkedIn, github, portfolio, cvFile, cvText } = body

    const profile = await prisma.jobSeekerProfile.update({
      where: { userId: session.user.id },
      data: {
        headline, bio, phone, location,
        skills: skills ? JSON.stringify(skills) : undefined,
        desiredSectors: desiredSectors ? JSON.stringify(desiredSectors) : undefined,
        employmentType,
        desiredSalaryMin, desiredSalaryMax, desiredLocation, remotePreference,
        linkedIn, github, portfolio, cvFile, cvText,
      },
      include: { experiences: true, educations: true, certificates: true },
    })
```

In the `LEARNER` branch of `PUT` (around line 80), the same rename:

```ts
    const { headline, bio, phone, location, skills, desiredSectors, employmentType, desiredSalaryMin, desiredSalaryMax, desiredLocation, remotePreference, linkedIn, github, portfolio, cvFile, cvText } = body

    const profile = await prisma.learnerProfile.update({
      where: { userId: session.user.id },
      data: {
        headline, bio, phone, location,
        skills: skills ? JSON.stringify(skills) : undefined,
        desiredSectors: desiredSectors ? JSON.stringify(desiredSectors) : undefined,
        employmentType,
        desiredSalaryMin, desiredSalaryMax, desiredLocation, remotePreference,
        linkedIn, github, portfolio, cvFile, cvText,
      },
      include: { experiences: true, educations: true, certificates: true },
    })
```

- [ ] **Step 6: Update `lib/matching.ts` — interface, scoring, and candidate pre-filter**

Replace the `CandidateProfile` interface (lines 3-10):

```ts
interface CandidateProfile {
  id: string
  skills: string
  location?: string | null
  desiredSectors?: string | null
  experiences?: Array<{ startDate?: Date | null; endDate?: Date | null; current?: boolean }>
}
```

Remove the `calculateTitleScore` function entirely (lines 59-67):

```ts
function calculateTitleScore(desiredRolesJson: string | null | undefined, jobTitle: string, maxPoints: number): number {
  if (!desiredRolesJson) return 0
  const desiredRoles = parseSkills(desiredRolesJson)
  const titleLower = jobTitle.toLowerCase()
  for (const role of desiredRoles) {
    if (titleLower.includes(role.toLowerCase()) || role.toLowerCase().includes(titleLower)) return maxPoints
  }
  return 0
}
```

Replace it with a new `calculateSectorScore` function in the same spot:

```ts
function calculateSectorScore(desiredSectorsJson: string | null | undefined, jobSector: string, maxPoints: number): number {
  if (!desiredSectorsJson) return 0
  const desiredSectors = parseSkills(desiredSectorsJson)
  const jobSectorLower = jobSector.toLowerCase()
  const matches = desiredSectors.some((s) => s.toLowerCase() === jobSectorLower)
  return matches ? maxPoints : 0
}
```

Replace `calculateMatchScore` (lines 69-93) entirely:

```ts
export function calculateMatchScore(candidate: CandidateProfile, job: JobData): MatchResult {
  const weights = { skills: 45, sector: 30, location: 15, seniority: 10 }

  const candidateSkills = parseSkills(candidate.skills)
  const jobSkills = parseSkills(job.requiredSkills)

  const matchedSkills = candidateSkills.filter((s) =>
    jobSkills.some((js) => js.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(js.toLowerCase()))
  )
  const missingSkills = jobSkills.filter((js) =>
    !candidateSkills.some((s) => s.toLowerCase().includes(js.toLowerCase()) || js.toLowerCase().includes(s.toLowerCase()))
  )
  const skillsScore = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * weights.skills : 0

  const sectorScore = calculateSectorScore(candidate.desiredSectors, job.sector, weights.sector)
  const locationScore = calculateLocationScore(candidate.location, job.location, weights.location)
  const seniorityScore = calculateSeniorityScore(candidate.experiences, job.experienceLevel, weights.seniority)

  const totalScore = Math.round(skillsScore + sectorScore + locationScore + seniorityScore)

  return { score: Math.min(totalScore, 100), matchedSkills, missingSkills }
}
```

Replace `runMatchingForCandidate` (lines 95-141) entirely — this changes the candidate-building logic (drop `courseSector`, use `desiredSectors`) and the job pre-filter (multi-sector `in` filter instead of single-value equality, and now applies to both roles instead of learners only):

```ts
export async function runMatchingForCandidate(candidateId: string, role: "JOB_SEEKER" | "LEARNER") {
  let candidate: CandidateProfile

  if (role === "LEARNER") {
    const profile = await prisma.learnerProfile.findUnique({
      where: { id: candidateId },
      include: { experiences: true },
    })
    if (!profile) return
    candidate = { id: profile.id, skills: profile.skills, location: profile.location, desiredSectors: profile.desiredSectors, experiences: profile.experiences }
  } else {
    const profile = await prisma.jobSeekerProfile.findUnique({
      where: { id: candidateId },
      include: { experiences: true },
    })
    if (!profile) return
    candidate = { id: profile.id, skills: profile.skills, location: profile.location, desiredSectors: profile.desiredSectors, experiences: profile.experiences }
  }

  const jobWhere: Record<string, unknown> = { status: "ACTIVE" }
  const desiredSectorList = parseSkills(candidate.desiredSectors || "[]")
  if (desiredSectorList.length > 0) {
    jobWhere.sector = { in: desiredSectorList }
  }

  const jobs = await prisma.job.findMany({ where: jobWhere })

  for (const job of jobs) {
    const result = calculateMatchScore(candidate, job)
    const matchData = {
      matchScore: result.score,
      matchedSkills: JSON.stringify(result.matchedSkills),
      missingSkills: JSON.stringify(result.missingSkills),
    }
    const where = role === "LEARNER"
      ? { jobId: job.id, learnerId: candidateId }
      : { jobId: job.id, jobSeekerId: candidateId }

    const existing = await prisma.jobMatch.findFirst({ where })
    if (existing) {
      await prisma.jobMatch.update({ where: { id: existing.id }, data: matchData })
    } else {
      await prisma.jobMatch.create({
        data: { jobId: job.id, ...(role === "LEARNER" ? { learnerId: candidateId } : { jobSeekerId: candidateId }), ...matchData },
      })
    }
  }
}
```

Finally, in `runMatchingForJob`, update the two candidate-construction lines that reference `desiredRoles`/`courseSector`:

```ts
  const jobSeekers = await prisma.jobSeekerProfile.findMany({ include: { experiences: true } })
  for (const js of jobSeekers) {
    const candidate: CandidateProfile = { id: js.id, skills: js.skills, location: js.location, desiredSectors: js.desiredSectors, experiences: js.experiences }
```

and

```ts
  const learners = await prisma.learnerProfile.findMany({ include: { experiences: true } })
  for (const l of learners) {
    const candidate: CandidateProfile = { id: l.id, skills: l.skills, location: l.location, desiredSectors: l.desiredSectors, experiences: l.experiences }
```

- [ ] **Step 7: Verify**

```bash
npx tsc --noEmit
```

Expected: errors will still show in `app/(dashboard)/learner/profile/page.tsx` and `app/(dashboard)/jobseeker/profile/page.tsx` — those are fixed in Task 3. There should be **no errors** in `lib/matching.ts`, `lib/profile-completion.ts`, `app/api/candidates/profile/route.ts`, or `prisma/seed.ts`.

Re-run the seed to confirm it works end to end:

```bash
npx prisma db seed
```

Expected: `Seed completed successfully` with no errors, and the 6 sectors created without duplicate-key errors.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts lib/profile-completion.ts lib/matching.ts app/api/candidates/profile/route.ts
git commit -m "feat: rename desiredRoles to desiredSectors, add employmentType, rework matching sector logic"
```

---

### Task 3: Learner + Job Seeker profile UI

**Files:**
- Modify: `app/(dashboard)/learner/profile/page.tsx`
- Modify: `app/(dashboard)/jobseeker/profile/page.tsx`

**Interfaces:**
- Consumes: `GET /api/sectors` (Task 1) → `{ id, name, isActive, createdAt }[]`.
- Consumes: `PUT /api/candidates/profile` now expecting `desiredSectors: string[]` and `employmentType: string` (Task 2).

- [ ] **Step 1: Update the Learner profile page**

In `app/(dashboard)/learner/profile/page.tsx`:

Replace the `profile` state's salary fields (line 31) — remove `desiredSalaryMin`/`desiredSalaryMax` as free strings and replace with a single `salaryBand` string, and add `employmentType`:

```ts
  const [profile, setProfile] = useState({
    headline: "", bio: "", phone: "", location: "", photo: "",
    linkedIn: "", github: "", portfolio: "",
    salaryBand: "", employmentType: "", desiredLocation: "", remotePreference: "",
    cvFile: "", cvText: "",
  })
```

Replace `desiredRoles`/`roleInput` state (lines 36-37) with sector state and the sectors list from the API:

```ts
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([])
  const [desiredSectors, setDesiredSectors] = useState<string[]>([])
  const [sectorLimitMsg, setSectorLimitMsg] = useState("")
```

Add a helper above the component (or inside it, before `loadProfile`) to convert between salary numbers and band labels:

```ts
const SALARY_BANDS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Under £25,000", min: null, max: 25000 },
  { label: "£25,000 – £35,000", min: 25000, max: 35000 },
  { label: "£35,000 – £50,000", min: 35000, max: 50000 },
]

function bandFromSalary(min: number | null | undefined, max: number | null | undefined): string {
  const found = SALARY_BANDS.find((b) => b.min === (min ?? null) && b.max === (max ?? null))
  return found?.label || ""
}
```

In `loadProfile` (around line 42), fetch sectors alongside the profile, and replace the salary/roles handling:

```ts
  const loadProfile = useCallback(async () => {
    const [profileRes, sectorsRes] = await Promise.all([
      fetch("/api/candidates/profile"),
      fetch("/api/sectors"),
    ])
    if (sectorsRes.ok) setSectors(await sectorsRes.json())
    if (profileRes.ok) {
      const data = await profileRes.json()
      setProfile({
        headline: data.headline || "", bio: data.bio || "",
        phone: data.phone || "", location: data.location || "",
        photo: data.photo || "", linkedIn: data.linkedIn || "",
        github: data.github || "", portfolio: data.portfolio || "",
        salaryBand: bandFromSalary(data.desiredSalaryMin, data.desiredSalaryMax),
        employmentType: data.employmentType || "",
        desiredLocation: data.desiredLocation || "",
        remotePreference: data.remotePreference || "",
        cvFile: data.cvFile || "", cvText: data.cvText || "",
      })
      setCourseInfo({
        courseName: data.courseName || "", courseSector: data.courseSector || "",
        ragStatus: data.ragStatus || "GREEN",
        ms1Achieved: data.ms1Achieved || false, ms2Achieved: data.ms2Achieved || false, ms3Achieved: data.ms3Achieved || false,
        providerName: data.provider?.organisationName || "",
      })
      try { setSkills(JSON.parse(data.skills || "[]")) } catch { setSkills([]) }
      try { setDesiredSectors(JSON.parse(data.desiredSectors || "[]")) } catch { setDesiredSectors([]) }
      setExperiences(data.experiences || [])
      setEducations(data.educations || [])
      setCertificates(data.certificates || [])
      setCompletion({ percentage: data.profileComplete || 0, incomplete: data.incomplete || [] })
    }
  }, [])
```

Update `saveProfile` (around line 74) to send the band's min/max and drop the old `desiredRoles` field:

```ts
  async function saveProfile() {
    setSaving(true); setMessage("")
    const band = SALARY_BANDS.find((b) => b.label === profile.salaryBand)
    const res = await fetch("/api/candidates/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile, skills, desiredSectors,
        employmentType: profile.employmentType || null,
        desiredSalaryMin: band ? band.min : null,
        desiredSalaryMax: band ? band.max : null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setCompletion({ percentage: data.profileComplete, incomplete: data.incomplete || [] })
      setMessage("Profile saved successfully")
    } else { setMessage("Failed to save profile") }
    setSaving(false); setTimeout(() => setMessage(""), 3000)
  }
```

Add a sector toggle handler (place it near `saveProfile`):

```ts
  function toggleSector(name: string) {
    setSectorLimitMsg("")
    if (desiredSectors.includes(name)) {
      setDesiredSectors(desiredSectors.filter((s) => s !== name))
      return
    }
    if (desiredSectors.length >= 5) {
      setSectorLimitMsg("Maximum 5 sectors")
      return
    }
    setDesiredSectors([...desiredSectors, name])
  }
```

Replace the entire Preferences `TabsContent` block (lines 300-315) with:

```tsx
          <TabsContent value="preferences">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div>
                <Label>Desired Sector (up to 5)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sectors.map((s) => {
                    const selected = desiredSectors.includes(s.name)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSector(s.name)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selected ? "bg-primary text-white border-primary" : "bg-white text-gray-700 border-gray-300 hover:border-primary"}`}
                      >
                        {s.name}
                      </button>
                    )
                  })}
                </div>
                {sectorLimitMsg && <p className="text-xs text-red-600 mt-1">{sectorLimitMsg}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Desired Salary</Label>
                  <Select value={profile.salaryBand} onChange={(e) => setProfile({ ...profile, salaryBand: e.target.value })}>
                    <option value="">Not specified</option>
                    {SALARY_BANDS.map((b) => <option key={b.label} value={b.label}>{b.label}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Employment Type</Label>
                  <Select value={profile.employmentType} onChange={(e) => setProfile({ ...profile, employmentType: e.target.value })}>
                    <option value="">Not specified</option>
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="BOTH">Both</option>
                  </Select>
                </div>
                <div><Label>Preferred Location</Label><Input value={profile.desiredLocation} onChange={(e) => setProfile({ ...profile, desiredLocation: e.target.value })} /></div>
                <div><Label>Remote</Label><Select value={profile.remotePreference} onChange={(e) => setProfile({ ...profile, remotePreference: e.target.value })}><option value="">Select...</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ON_SITE">On-site</option><option value="FLEXIBLE">Flexible</option></Select></div>
              </div>
              <Button onClick={saveProfile} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Preferences"}</Button>
            </div>
          </TabsContent>
```

- [ ] **Step 2: Update the Job Seeker profile page**

In `app/(dashboard)/jobseeker/profile/page.tsx`, apply the equivalent changes:

Replace the `profile` state (line 55):

```ts
  const [profile, setProfile] = useState({
    headline: "", bio: "", phone: "", location: "", photo: "",
    linkedIn: "", github: "", portfolio: "",
    salaryBand: "", employmentType: "", desiredLocation: "", remotePreference: "",
    cvFile: "", cvText: "",
  })
```

Replace `desiredRoles`/`roleInput` state (lines 63-64):

```ts
  const [sectors, setSectors] = useState<{ id: string; name: string }[]>([])
  const [desiredSectors, setDesiredSectors] = useState<string[]>([])
  const [sectorLimitMsg, setSectorLimitMsg] = useState("")
```

Add the same salary-band helpers used in the Learner page (module scope, above the component — outside the `JobSeekerProfilePage` function):

```ts
const SALARY_BANDS: { label: string; min: number | null; max: number | null }[] = [
  { label: "Under £25,000", min: null, max: 25000 },
  { label: "£25,000 – £35,000", min: 25000, max: 35000 },
  { label: "£35,000 – £50,000", min: 35000, max: 50000 },
]

function bandFromSalary(min: number | null | undefined, max: number | null | undefined): string {
  const found = SALARY_BANDS.find((b) => b.min === (min ?? null) && b.max === (max ?? null))
  return found?.label || ""
}
```

Update `loadProfile` (line 69):

```ts
  const loadProfile = useCallback(async () => {
    const [profileRes, sectorsRes] = await Promise.all([
      fetch("/api/candidates/profile"),
      fetch("/api/sectors"),
    ])
    if (sectorsRes.ok) setSectors(await sectorsRes.json())
    if (profileRes.ok) {
      const data = await profileRes.json()
      setProfile({
        headline: data.headline || "", bio: data.bio || "",
        phone: data.phone || "", location: data.location || "",
        photo: data.photo || "", linkedIn: data.linkedIn || "",
        github: data.github || "", portfolio: data.portfolio || "",
        salaryBand: bandFromSalary(data.desiredSalaryMin, data.desiredSalaryMax),
        employmentType: data.employmentType || "",
        desiredLocation: data.desiredLocation || "",
        remotePreference: data.remotePreference || "",
        cvFile: data.cvFile || "", cvText: data.cvText || "",
      })
      try { setSkills(JSON.parse(data.skills || "[]")) } catch { setSkills([]) }
      try { setDesiredSectors(JSON.parse(data.desiredSectors || "[]")) } catch { setDesiredSectors([]) }
      setExperiences(data.experiences || [])
      setEducations(data.educations || [])
      setCertificates(data.certificates || [])
      setCompletion({ percentage: data.profileComplete || 0, incomplete: data.incomplete || [] })
    }
  }, [])
```

Update `saveProfile` (line 95):

```ts
  async function saveProfile() {
    setSaving(true)
    setMessage("")
    const band = SALARY_BANDS.find((b) => b.label === profile.salaryBand)
    const res = await fetch("/api/candidates/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...profile,
        skills,
        desiredSectors,
        employmentType: profile.employmentType || null,
        desiredSalaryMin: band ? band.min : null,
        desiredSalaryMax: band ? band.max : null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setCompletion({ percentage: data.profileComplete, incomplete: data.incomplete || [] })
      setMessage("Profile saved successfully")
    } else {
      setMessage("Failed to save profile")
    }
    setSaving(false)
    setTimeout(() => setMessage(""), 3000)
  }
```

Remove the `addRole` function (lines 225-231) and replace with:

```ts
  function toggleSector(name: string) {
    setSectorLimitMsg("")
    if (desiredSectors.includes(name)) {
      setDesiredSectors(desiredSectors.filter((s) => s !== name))
      return
    }
    if (desiredSectors.length >= 5) {
      setSectorLimitMsg("Maximum 5 sectors")
      return
    }
    setDesiredSectors([...desiredSectors, name])
  }
```

Replace the entire Preferences `TabsContent` block (lines 400-445) with:

```tsx
          <TabsContent value="preferences">
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              <div>
                <Label>Desired Sector (up to 5)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sectors.map((s) => {
                    const selected = desiredSectors.includes(s.name)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSector(s.name)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selected ? "bg-primary text-white border-primary" : "bg-white text-gray-700 border-gray-300 hover:border-primary"}`}
                      >
                        {s.name}
                      </button>
                    )
                  })}
                </div>
                {sectorLimitMsg && <p className="text-xs text-red-600 mt-1">{sectorLimitMsg}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salaryBand">Desired Salary</Label>
                  <Select id="salaryBand" value={profile.salaryBand} onChange={(e) => setProfile({ ...profile, salaryBand: e.target.value })}>
                    <option value="">Not specified</option>
                    {SALARY_BANDS.map((b) => <option key={b.label} value={b.label}>{b.label}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select id="employmentType" value={profile.employmentType} onChange={(e) => setProfile({ ...profile, employmentType: e.target.value })}>
                    <option value="">Not specified</option>
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="BOTH">Both</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="desiredLocation">Preferred Location</Label>
                  <Input id="desiredLocation" placeholder="e.g. London" value={profile.desiredLocation} onChange={(e) => setProfile({ ...profile, desiredLocation: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="remote">Remote Preference</Label>
                  <Select id="remote" value={profile.remotePreference} onChange={(e) => setProfile({ ...profile, remotePreference: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="REMOTE">Remote Only</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ON_SITE">On-site Only</option>
                    <option value="FLEXIBLE">Flexible</option>
                  </Select>
                </div>
              </div>
              <Button onClick={saveProfile} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </TabsContent>
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors anywhere in the project.

Manually, in the browser:
1. Log in as `learner@edvancefe.com` → Profile → Preferences tab.
2. Confirm the sector chips render (from the 6 seeded sectors) instead of the old free-text input.
3. Click 5 sector chips — confirm they highlight. Click a 6th — confirm the "Maximum 5 sectors" message appears and the 6th does not get added.
4. Select a salary band and an employment type, click "Save Preferences" — confirm "Profile saved successfully".
5. Refresh the page — confirm the same 5 sectors, salary band, and employment type are still selected (round-trip persistence).
6. Repeat steps 1-5 logged in as `seeker@edvancefe.com`.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/learner/profile/page.tsx" "app/(dashboard)/jobseeker/profile/page.tsx"
git commit -m "feat: replace desired-role free text with sector multi-select, salary bands, employment type"
```

---

### Task 4: Final verification

**Files:** None (verification only).

- [ ] **Step 1: Full type-check and build**

```bash
npx tsc --noEmit
npx next build
```

Expected: both succeed with no errors.

- [ ] **Step 2: Verify matching end-to-end**

As `SUPER_ADMIN`, trigger a full matching run (existing `/admin/matching` page or `POST /api/matching/run-all`), then check a learner with a sector selected in a sector that also has an active job with zero overlapping skills — confirm their match score for that job is at least 30 (the sector floor) rather than near-zero.

- [ ] **Step 3: Confirm production sectors need manual setup**

Note for deployment: this plan does not auto-seed sectors into production, since `SEED_ON_DEPLOY` wiping the database is not appropriate on a live database with real accounts (per this project's existing convention — see the earlier Railway/Vercel deployment work). After this deploys, log into the live site as Super Admin and add the 6 sectors via `/admin/sectors` manually — same one-time step as any admin-managed lookup data.

- [ ] **Step 4: Final commit if any fixups were needed**

```bash
git add -A
git commit -m "fix: address issues found in final verification"
```

(Skip this step if Steps 1-2 passed clean with no changes needed.)
