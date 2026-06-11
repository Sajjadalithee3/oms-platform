# EdvanceFE Phase 1 — Foundation, Auth & Dashboard Shells

## Goal

Deliver a running Next.js 14 app with working authentication, role-based routing, and skeleton dashboards for all 6 roles. After this phase, every seed user can log in and see their dashboard with real stats from the database.

---

## Scope

### In scope
- Project scaffold (Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui)
- Full Prisma schema (all models from master prompt) + SQLite
- Seed data (6 users, 1 provider, 1 employer, 10 jobs, 3 learners, applications, matches, system settings)
- NextAuth v5 with credentials provider, role in JWT/session
- Middleware: role-based route protection + redirects
- Login page + signup page (role selector, multi-step form)
- Shared layout: Sidebar (per-role nav) + TopBar (title, notification bell placeholder, user dropdown)
- Dashboard overview pages for all 6 roles with real stats from DB
- Brand: `#5B4FE8` primary, Inter font, Lucide icons only, clean light UI

### Out of scope (later phases)
- Profile builders, CV parser, matching engine, job scraper
- Messaging, interviews, applications flow
- Analytics charts (Recharts), audit log UI, CSV export
- Notification system (bell is placeholder only)

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14, App Router, TypeScript |
| Database | Prisma ORM + SQLite (`file:./dev.db`) |
| Auth | NextAuth.js v5, credentials provider |
| Styling | Tailwind CSS + shadcn/ui |
| Icons | Lucide React |
| Password hashing | bcryptjs |

---

## Architecture

### Route Structure

```
app/
  (auth)/
    login/page.tsx
    signup/page.tsx
  (dashboard)/
    admin/page.tsx
    staff/page.tsx
    provider/page.tsx
    employer/page.tsx
    learner/page.tsx
    jobseeker/page.tsx
  api/
    auth/[...nextauth]/route.ts
    auth/signup/route.ts
  layout.tsx
  page.tsx              (redirects to /login)
```

### Middleware Rules

| Route Pattern | Allowed Roles |
|---------------|---------------|
| `/admin/*` | SUPER_ADMIN |
| `/staff/*` | INTERNAL_STAFF, SUPER_ADMIN |
| `/provider/*` | TRAINING_PROVIDER, SUPER_ADMIN |
| `/employer/*` | EMPLOYER, SUPER_ADMIN |
| `/learner/*` | LEARNER |
| `/jobseeker/*` | JOB_SEEKER |

Unauthenticated users redirect to `/login`. Authenticated users hitting the wrong role's routes redirect to their own dashboard.

### Post-Login Redirects

| Role | Dashboard |
|------|-----------|
| SUPER_ADMIN | `/admin` |
| INTERNAL_STAFF | `/staff` |
| TRAINING_PROVIDER | `/provider` |
| EMPLOYER | `/employer` |
| LEARNER | `/learner` |
| JOB_SEEKER | `/jobseeker` |

---

## Database

Full Prisma schema from master prompt (all 18 models). Even though later phases use most models, we define them all now so seed data works and the schema is stable.

### Seed Users

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | admin@edvancefe.com | Admin@1234 |
| INTERNAL_STAFF | staff@edvancefe.com | Staff@1234 |
| TRAINING_PROVIDER | provider@codeinstitute.com | Provider@1234 |
| EMPLOYER | employer@techcorp.com | Employer@1234 |
| LEARNER | learner@edvancefe.com | Learner@1234 |
| JOB_SEEKER | seeker@edvancefe.com | Seeker@1234 |

### Seed Data

- Provider: "Code Institute", Health & Social Care sector
- 1 course, 1 cohort (Jan 2026, 20 expected learners)
- 3 learners linked to the provider, courseSector = "Health & Social Care"
- Employer: "TechCorp Ltd"
- 10 jobs (mix internal/scraped, mix sectors, 3 in Health & Social Care)
- Pre-calculated JobMatch records
- 2 applications with message threads
- 1 job board (Reed, inactive)
- SystemSetting: min_match_threshold = 40
- AuditLog entries

---

## UI Components

### Sidebar (`components/dashboard/Sidebar.tsx`)
- EdvanceFE logo top (text in `#5B4FE8`)
- Role label below logo
- Nav items with Lucide icons, active item bg `#5B4FE8` with white text
- User info + logout at bottom
- Collapses to hamburger on mobile (< 768px)
- Each role has its own nav array — no shared nav items

### TopBar (`components/dashboard/TopBar.tsx`)
- Page title (dynamic)
- Notification bell (Lucide `Bell` icon, placeholder — no dropdown yet)
- User avatar + name + dropdown (profile link, logout)

### Dashboard Layout (`app/(dashboard)/layout.tsx`)
- Sidebar + main content area
- Responsive: sidebar as overlay on mobile

### Login Page
- Centered card, EdvanceFE logo, tagline "Smarter Progression Management"
- Email + password fields, sign in button (`#5B4FE8`)
- Link to signup, error state for wrong credentials

### Signup Page
- Step 1: Role selector (3 large cards: Job Seeker, Employer, Training Provider)
- Step 2: Role-specific form fields
- Creates User + profile, hashes password, auto-login, redirect

---

## Dashboard Overview Pages (Phase 1 Content)

Each page queries real data from the seed DB and shows stat cards.

### Admin (`/admin`)
- Cards: Total Providers, Total Employers, Total Learners, Total Job Seekers, Total Jobs
- Placeholder for charts (empty chart containers, populated in Phase 5)

### Staff (`/staff`)
- Cards: Active Candidates, Jobs Today, Matches Today

### Provider (`/provider`)
- Cards: Total Learners, Active Learners, MS2 Achieved, MS3 Achieved
- RAG breakdown as colored stat cards (not chart yet)

### Employer (`/employer`)
- Cards: Active Jobs, Total Applications, Interviews Scheduled, Shortlisted

### Learner (`/learner`)
- Cards: Profile Completion %, Matched Jobs, Applications, Milestones summary

### Job Seeker (`/jobseeker`)
- Cards: Profile Completion %, Matched Jobs, Applications

---

## API Routes (Phase 1)

- `POST /api/auth/signup` — create user + profile, hash password, return user
- `GET /api/auth/[...nextauth]` + `POST` — NextAuth handler

---

## Files to Create (~30 files)

1. `package.json` + dependency install
2. `tailwind.config.ts` — brand color `primary: '#5B4FE8'`
3. `tsconfig.json`
4. `next.config.js`
5. `.env`
6. `prisma/schema.prisma` — all 18 models
7. `prisma/seed.ts`
8. `lib/prisma.ts` — singleton client
9. `lib/auth.ts` — NextAuth config
10. `lib/utils.ts` — cn() helper
11. `middleware.ts`
12. `app/layout.tsx` — root layout with Inter font
13. `app/page.tsx` — redirect to login
14. `app/(auth)/login/page.tsx`
15. `app/(auth)/signup/page.tsx`
16. `app/api/auth/[...nextauth]/route.ts`
17. `app/api/auth/signup/route.ts`
18. `app/(dashboard)/layout.tsx`
19. `app/(dashboard)/admin/page.tsx`
20. `app/(dashboard)/staff/page.tsx`
21. `app/(dashboard)/provider/page.tsx`
22. `app/(dashboard)/employer/page.tsx`
23. `app/(dashboard)/learner/page.tsx`
24. `app/(dashboard)/jobseeker/page.tsx`
25. `components/dashboard/Sidebar.tsx`
26. `components/dashboard/TopBar.tsx`
27. `components/ui/button.tsx` (shadcn)
28. `components/ui/input.tsx` (shadcn)
29. `components/ui/card.tsx` (shadcn)
30. `components/ui/label.tsx` (shadcn)

---

## Success Criteria

- [ ] `npm run dev` starts without errors
- [ ] All 6 seed users can log in
- [ ] Each user redirects to their correct dashboard
- [ ] Accessing another role's route redirects back
- [ ] Signup works for Job Seeker, Employer, Training Provider
- [ ] Dashboard overview pages show real stats from seed data
- [ ] UI uses `#5B4FE8` brand color, Lucide icons, no emojis
- [ ] Mobile: sidebar collapses to hamburger
