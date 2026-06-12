# EdvanceFE

A full-stack Outcome Management System (OMS) and job matching platform for UK funded skills provision. Serves 6 distinct user roles with isolated dashboards, role-based access, a skills-based matching engine, and multi-source job scraping.

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database:** Prisma 6 + SQLite (swap to Postgres via `DATABASE_URL`)
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
- Match percentage displayed on job cards
- Application tracking with messaging

## Matching Engine

5-dimension scoring algorithm (max 100 points):

| Dimension  | Weight | Method                                      |
|------------|--------|---------------------------------------------|
| Skills     | 50 pts | Keyword overlap between candidate and job   |
| Sector     | 20 pts | Exact sector match                          |
| Location   | 15 pts | City/region match                           |
| Seniority  | 10 pts | Experience level alignment                  |
| Title      | 5 pts  | Job title keyword similarity                |

Minimum threshold configurable via System Settings (default: 40).

## Key Architecture Decisions

- **RLS at API level:** Every API route filters by authenticated user's scope. Provider routes filter by `providerId`, employer routes by `employerId`.
- **Sector lock for learners:** Job queries for learners always include `WHERE sector = learner.courseSector`.
- **Learner vs Job Seeker separation:** Completely separate route groups, components, and navigation. No shared page components.
- **Scraped job behaviour:** Internal jobs show inline Apply form. External jobs (Reed/Adzuna/RSS) link to the source.
- **Audit logging:** Every create, update, delete action writes to the AuditLog table.

## Environment Variables

| Variable           | Description                              |
|--------------------|------------------------------------------|
| `DATABASE_URL`     | Prisma database connection string        |
| `NEXTAUTH_SECRET`  | JWT signing secret                       |
| `NEXTAUTH_URL`     | Base URL for NextAuth callbacks           |
| `REED_API_KEY`     | Reed job board API key (optional)        |
| `ADZUNA_APP_ID`    | Adzuna API app ID (optional)             |
| `ADZUNA_APP_KEY`   | Adzuna API app key (optional)            |
| `RESEND_API_KEY`   | Resend email API key (optional)          |

## Production Deployment

To switch from SQLite to PostgreSQL, update `DATABASE_URL` in `.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/edvancefe"
```

Then update `prisma/schema.prisma` provider from `sqlite` to `postgresql` and run migrations.
