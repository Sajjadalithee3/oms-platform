# EdvanceFE Phase 2 — User Profiles, CV Parser & Course Management

**Goal:** Build full profile management for all candidate roles, CV parsing with PDF/DOCX support, course/cohort management for training providers, and shared components (DataTable, ProfileProgress, MatchBadge).

**Architecture:** Extends Phase 1 foundation. New API routes for profile CRUD, CV upload/parse, courses/cohorts. Shared reusable components. Profile completion calculated dynamically.

**Tech Stack additions:** pdf-parse, mammoth, recharts (for charts in later phases)

---

## Task 1: Install New Dependencies

Install packages needed for Phase 2:
- `pdf-parse` — PDF text extraction
- `mammoth` — DOC/DOCX text extraction  
- `recharts` — charts (needed for provider analytics)
- `@types/pdf-parse` — type definitions

Run: `npm install pdf-parse mammoth recharts && npm install -D @types/pdf-parse`

---

## Task 2: Shared UI Components

Build reusable components used across multiple dashboards:

### `components/ui/textarea.tsx`
- Standard textarea with Tailwind styling matching Input component
- ForwardRef pattern

### `components/ui/badge.tsx`
- Variant prop: default, secondary, destructive, outline
- Color prop for custom colors

### `components/ui/dialog.tsx`
- Modal dialog with overlay
- DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter

### `components/ui/select.tsx`
- Styled select dropdown matching the design system

### `components/ui/tabs.tsx`
- Tab navigation component: TabsList, TabsTrigger, TabsContent

### `components/shared/DataTable.tsx`
- Reusable table with: column definitions, sortable headers, search/filter input, pagination (10/25/50 per page), export CSV button, optional row selection for bulk actions
- Props: columns, data, searchable, exportable, pageSize

### `components/shared/ProfileProgress.tsx`
- Visual progress bar in `#5B4FE8`
- Shows percentage and which sections are incomplete
- Clickable incomplete sections

### `components/shared/MatchBadge.tsx`
- Shows match % as colored badge
- 0-39%: red, 40-59%: amber, 60-79%: blue, 80-100%: green
- Tooltip with matched/missing skills

---

## Task 3: CV Parser Library

Create `lib/cv-parser.ts` following the master prompt spec exactly:
- `parseCV(fileBuffer, mimeType)` — main function
- PDF parsing via pdf-parse
- DOC/DOCX parsing via mammoth
- `extractEmail(text)` — regex for email
- `extractPhone(text)` — UK phone format regex
- `extractName(text)` — first non-empty line
- `extractSkills(text)` — keyword matching against known skills list (tech, healthcare, business, construction)
- `extractLocation(text)` — UK cities matching
- `extractExperience(text)` — pattern matching for job titles
- `extractEducation(text)` — pattern matching for degrees/qualifications

---

## Task 4: CV Upload API Route

Create `app/api/upload/cv/route.ts`:
- POST handler accepting multipart form data
- Accept PDF, DOC, DOCX files (validate mime type)
- Max file size: 5MB
- Parse CV using `lib/cv-parser.ts`
- Return extracted data as JSON (don't save to DB yet — client confirms first)
- Auth required (JOB_SEEKER, LEARNER, TRAINING_PROVIDER, INTERNAL_STAFF, SUPER_ADMIN)

Create `app/api/upload/cv-bulk/route.ts`:
- POST handler accepting multiple files
- For TRAINING_PROVIDER role only
- Parse each file, return array of extracted profiles
- Include providerId and cohortId from form data

---

## Task 5: CV Upload Component

Create `components/candidates/CVUpload.tsx`:
- Drag and drop zone or click to upload
- Accept PDF, DOC, DOCX
- Shows file name + size after selection
- Progress indicator during upload and parsing
- Shows extracted data preview (name, email, phone, skills found)
- "Confirm & Save" or "Edit before saving" buttons
- Props: onParsed callback, onSave callback

---

## Task 6: Job Seeker Profile Page

Create `app/(dashboard)/jobseeker/profile/page.tsx`:
- Full profile builder with tabbed sections:
  1. **Personal Info** — name, headline, bio, phone, location, photo URL
  2. **Skills** — tag input, add/remove skills
  3. **Experience** — list with add/edit/delete (title, company, location, dates, current, description)
  4. **Education** — list with add/edit/delete (institution, degree, field, dates)
  5. **Certificates** — list with add/edit/delete (name, issuer, date, file URL)
  6. **CV Upload** — drag & drop, auto-fills fields from parsed CV
  7. **Preferences** — desired roles (tag input), salary range (min/max), location, remote preference
  8. **Social Links** — LinkedIn, GitHub, portfolio URLs
- Profile completion bar at top (updates live as sections are filled)
- Save button per section
- All data persisted via API routes

Create API routes:
- `app/api/candidates/profile/route.ts` — GET (own profile), PUT (update own profile)
- `app/api/candidates/experience/route.ts` — GET, POST, PUT, DELETE
- `app/api/candidates/education/route.ts` — GET, POST, PUT, DELETE  
- `app/api/candidates/certificates/route.ts` — GET, POST, PUT, DELETE

---

## Task 7: Learner Profile Page

Create `app/(dashboard)/learner/profile/page.tsx`:
- Same depth as Job Seeker profile but with learner-specific fields:
  - Course info (read-only, set by provider)
  - RAG status badge (read-only)
  - Milestone tracking (read-only)
- Sections: Personal Info, Skills, Experience, Education, Certificates, CV Upload, Preferences, Social Links
- Profile completion bar
- Uses same API pattern but scoped to learner profile

Create API routes:
- `app/api/learners/profile/route.ts` — GET (own profile), PUT (update own profile)
- Reuse experience/education/certificates routes with learner support

---

## Task 8: Employer Profile Page

Create `app/(dashboard)/employer/profile/page.tsx`:
- Company profile builder:
  - Company name, logo URL, industry, company size, location
  - Website, description
  - LinkedIn, Twitter URLs
  - Verification status (read-only badge)
- Save button
- All data persisted via API

Create API route:
- `app/api/employers/profile/route.ts` — GET (own profile), PUT (update own profile)

---

## Task 9: Provider Course Management

Create `app/(dashboard)/provider/courses/page.tsx`:
- DataTable listing all courses for this provider
- Columns: name, sector, required skills, cohort count, learner count, status, actions
- "Add Course" button opens dialog/form
- Edit and delete actions per row

Create `app/(dashboard)/provider/courses/new/page.tsx` (or dialog):
- Form: name, sector (dropdown), required skills (tag input), duration, description
- Save creates course linked to provider

Create API routes:
- `app/api/providers/courses/route.ts` — GET (provider's courses), POST (create)
- `app/api/providers/courses/[id]/route.ts` — GET, PUT, DELETE

---

## Task 10: Provider Cohort Management

Create `app/(dashboard)/provider/cohorts/page.tsx`:
- DataTable listing all cohorts for this provider
- Columns: name, course, start/end dates, expected learners, actual learners, actions
- "Add Cohort" button

Create API routes:
- `app/api/providers/cohorts/route.ts` — GET, POST
- `app/api/providers/cohorts/[id]/route.ts` — GET, PUT, DELETE

---

## Task 11: Provider Learner Management

Create `app/(dashboard)/provider/learners/page.tsx`:
- DataTable with all learners belonging to this provider (RLS enforced)
- Columns: name, email, course, cohort, RAG status, profile %, MS1/MS2/MS3, actions
- Filter by course, cohort, RAG status
- Export CSV button
- "Add Learner" button (creates user account with LEARNER role)
- Bulk actions: download credentials CSV

Create `app/(dashboard)/provider/learners/[id]/page.tsx`:
- Learner detail view
- Edit profile, view applications, milestone tracking
- Update RAG status, milestones

Create `app/(dashboard)/provider/learners/upload/page.tsx`:
- Bulk CV upload page
- Drag and drop multiple PDF/DOC files
- Progress bar per file
- Select course + cohort assignment
- Preview extracted data before saving
- On save: create User + LearnerProfile for each

Create API routes:
- `app/api/providers/learners/route.ts` — GET (provider's learners), POST (create learner)
- `app/api/providers/learners/[id]/route.ts` — GET, PUT, DELETE
- `app/api/providers/learners/credentials/route.ts` — GET (download credentials CSV)

---

## Task 12: Profile Completion Calculator

Create `lib/profile-completion.ts`:
- `calculateJobSeekerCompletion(profile)` — check which fields are filled
- `calculateLearnerCompletion(profile)` — same for learner
- Weights: personal info 20%, skills 20%, experience 20%, education 15%, preferences 15%, CV 10%
- Returns { percentage: number, incomplete: string[] }
- Called on profile save, updates `profileComplete` field in DB

---

## Task 13: Update Sidebar Navigation

Update `components/dashboard/Sidebar.tsx` to add new nav items:
- Job Seeker: add Profile, Jobs, Applications, Messages
- Learner: add Profile, Jobs, Applications, Messages
- Employer: add Profile, Jobs, Applications, Interviews, Messages
- Provider: add Learners, Courses, Cohorts, Messages, Analytics
- Admin: add Providers, Employers, Users, Jobs, Scraper, Matching, Messages, Audit, Analytics, Settings
- Staff: add Candidates, Jobs, Pipeline, Matching, Analytics

---

## Task 14: End-to-End Verification

- Run `npx next build` — must pass clean
- Start dev server
- Test job seeker profile page: fill fields, save, verify completion updates
- Test CV upload: upload a test file, verify parsing
- Test provider courses: create, edit, delete
- Test provider learner management
- Verify all new routes are protected by middleware
