# EdvanceFE Phase 3 — Matching Engine, Job Scraper, Jobs, Applications, Messaging & Interviews

**Goal:** Build the core platform engine — job matching, job scraper integrations, jobs CRUD, applications workflow, messaging between employers/candidates, interview scheduling, and notification system.

**Architecture:** Builds on Phase 2 profiles. Matching engine scores candidates vs jobs. Scraper pulls jobs from Reed, Adzuna, RSS feeds. Messages are scoped to applications. Interviews are employer-initiated with slot proposals.

**Tech Stack additions:** fast-xml-parser (RSS parsing)

---

## Task 1: Install Dependencies

Install: `npm install fast-xml-parser`

---

## Task 2: Matching Engine — `lib/matching.ts`

Core scoring algorithm with 5 weighted dimensions:
- Skills overlap (50 pts) — fuzzy substring matching
- Sector match (20 pts) — exact match on sector
- Location match (15 pts) — UK city matching
- Experience level (10 pts) — infer from years of experience
- Job title keywords (5 pts) — desired roles vs job title

Export functions:
- `calculateMatchScore(candidate, job)` → `{ score, matchedSkills, missingSkills }`
- `runMatchingForCandidate(candidateId, role)` — match one candidate against all active jobs, store in JobMatch
- `runMatchingForJob(jobId)` — match one job against all candidates, store in JobMatch
- `runAllMatching()` — full re-match (admin only)

Sector lock: learner matching filters `WHERE job.sector = learner.courseSector`.
Minimum threshold: read `SystemSetting.min_match_threshold` (default 40).

---

## Task 3: Job Scraper Library — `lib/scraper/`

### `lib/scraper/reed.ts`
- `fetchFromReed(apiKey, keywords, location)` → normalized job array
- Reed API: Basic auth, `/api/1.0/search`

### `lib/scraper/adzuna.ts`
- `fetchFromAdzuna(appId, appKey, what, where)` → normalized job array
- Adzuna API: app_id + app_key query params

### `lib/scraper/rss.ts`
- `fetchFromRSS(feedUrl, fieldMappings)` → normalized job array
- Uses fast-xml-parser, applies field mapping from JobBoard config

### `lib/scraper/generic.ts`
- `fetchFromGenericUrl(url)` → raw HTML + metadata (admin maps fields manually)

### `lib/scraper/runner.ts`
- `runScraper(boardId)` — fetch from correct source, deduplicate, upsert jobs, trigger matching
- `inferSector(title, description)` — keyword-based sector classification

---

## Task 4: Jobs API — `app/api/jobs/`

### `app/api/jobs/route.ts` — GET/POST
- GET: list jobs filtered by role. Learners: sector-locked. Job seekers: all. Employers: own jobs only. Staff/Admin: all.
- POST: create job (employer only). Trigger matching on creation.

### `app/api/jobs/[id]/route.ts` — GET/PUT/DELETE
- GET: job detail with applications count
- PUT: update job (employer/admin)
- DELETE: soft delete (set status CLOSED)

---

## Task 5: Applications API — `app/api/applications/`

### `app/api/applications/route.ts` — GET/POST
- GET: scoped by role. Candidates see own. Employers see for their jobs. Staff/admin see all.
- POST: create application. Link to jobSeekerId or learnerId. Record matchScore.

### `app/api/applications/[id]/route.ts` — GET/PUT
- GET: application detail with messages, interviews
- PUT: update status (APPLIED → SHORTLISTED → INTERVIEW → OFFER → PLACED → REJECTED)

---

## Task 6: Messages API — `app/api/messages/`

### `app/api/messages/[applicationId]/route.ts` — GET/POST
- GET: all messages for application thread. Mark as read for current user.
- POST: send message. Sender = current user. Create notification for recipient.

---

## Task 7: Interviews API — `app/api/interviews/`

### `app/api/interviews/route.ts` — GET/POST
- GET: list interviews scoped by role
- POST: create interview with proposed slots (employer only)

### `app/api/interviews/[id]/route.ts` — PUT
- PUT: confirm slot (candidate) or update notes/location (employer)

---

## Task 8: Scraper API — `app/api/scraper/`

### `app/api/scraper/boards/route.ts` — GET/POST
- GET: list all job boards (admin/staff)
- POST: add new board config

### `app/api/scraper/boards/[id]/route.ts` — PUT/DELETE
- PUT: update board config/mappings
- DELETE: deactivate board

### `app/api/scraper/run/[boardId]/route.ts` — POST
- POST: trigger scraper run for one board (admin only)

---

## Task 9: Matching API — `app/api/matching/`

### `app/api/matching/run-candidate/[id]/route.ts` — POST
- Run matching for one candidate

### `app/api/matching/run-job/[id]/route.ts` — POST
- Run matching for one job

### `app/api/matching/run-all/route.ts` — POST
- Run full matching (admin/staff only)

---

## Task 10: Shared Components

### `components/messaging/MessageThread.tsx`
- Full chat UI: message bubbles, timestamps, read receipts
- Input box at bottom, send on Enter
- Polling every 10 seconds for new messages
- Provider read-only mode prop

### `components/interviews/InterviewScheduler.tsx`
- Employer: propose up to 3 date/time slots
- Candidate: view slots, confirm one
- Shows confirmed details with location/meeting link

### `components/shared/NotificationBell.tsx`
- Bell icon with unread count badge
- Dropdown with recent notifications
- Mark all read button

---

## Task 11: Notifications API — `app/api/notifications/`

### `app/api/notifications/route.ts` — GET
- Get current user's notifications, ordered by date

### `app/api/notifications/read/route.ts` — PUT
- Mark all notifications as read for current user

---

## Task 12: Employer Job Pages

### `app/(dashboard)/employer/jobs/page.tsx`
- DataTable listing own jobs: title, applications count, status, posted date
- "Post New Job" button

### `app/(dashboard)/employer/jobs/new/page.tsx`
- Job posting form: title, sector, required skills (tag input), location, salary range, job type, remote toggle, description, deadline
- On submit: POST to /api/jobs, trigger matching

### `app/(dashboard)/employer/jobs/[id]/page.tsx`
- Job detail with applicant list, match %, shortlist/reject actions

### `app/(dashboard)/employer/applications/page.tsx`
- All applications across employer's jobs

### `app/(dashboard)/employer/applications/[id]/page.tsx`
- Application detail: candidate profile, match breakdown, message thread, interview scheduler

### `app/(dashboard)/employer/interviews/page.tsx`
- Interview list with status

### `app/(dashboard)/employer/messages/page.tsx`
- All message threads

---

## Task 13: Learner Job & Application Pages

### `app/(dashboard)/learner/jobs/page.tsx`
- Sector-locked job feed. Filter by location, salary, job type. Sort by match %, date.

### `app/(dashboard)/learner/jobs/[id]/page.tsx`
- Job detail with match breakdown. Apply button (internal) or external link.

### `app/(dashboard)/learner/applications/page.tsx`
- Own applications list

### `app/(dashboard)/learner/applications/[id]/page.tsx`
- Application detail with message thread and interview info

### `app/(dashboard)/learner/messages/page.tsx`
- Message threads

---

## Task 14: Job Seeker Job & Application Pages

### `app/(dashboard)/jobseeker/jobs/page.tsx`
- Full job board, all sectors. Search + filters. Match % shown.

### `app/(dashboard)/jobseeker/jobs/[id]/page.tsx`
- Job detail with match breakdown

### `app/(dashboard)/jobseeker/applications/page.tsx`
- Own applications

### `app/(dashboard)/jobseeker/applications/[id]/page.tsx`
- Application detail with messaging

### `app/(dashboard)/jobseeker/messages/page.tsx`
- Message threads

---

## Task 15: Seed Data Update

Update `prisma/seed.ts` to add:
- 10 jobs (mix of internal + scraped, multiple sectors, 3 in Health & Social Care)
- Pre-calculated JobMatch records for seed candidates
- 2 applications with message threads
- 1 job board (Reed, inactive)
- System setting: `min_match_threshold = 40`
- Audit log entries

---

## Task 16: Build Verification

- Run `next build` — zero errors
- Verify all new routes compile
- Test matching engine with seed data
