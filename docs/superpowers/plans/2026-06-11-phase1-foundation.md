# EdvanceFE Phase 1 — Foundation, Auth & Dashboard Shells

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a running Next.js 14 app with working authentication, role-based routing, and overview dashboards for all 6 user roles, backed by seeded SQLite data.

**Architecture:** Next.js 14 App Router with route groups `(auth)` and `(dashboard)`. Prisma ORM with SQLite for data. NextAuth v5 credentials provider with role stored in JWT. Middleware enforces role-based access. Each dashboard role gets isolated routes and a dedicated sidebar nav.

**Tech Stack:** Next.js 14, TypeScript, Prisma + SQLite, NextAuth.js v5, Tailwind CSS, shadcn/ui, Lucide React, bcryptjs

---

## File Map

```
edvancefe/
├── .env
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── prisma/
│   ├── schema.prisma          — all 18 models
│   └── seed.ts                — 6 users, profiles, jobs, matches, etc.
├── lib/
│   ├── prisma.ts              — singleton Prisma client
│   ├── auth.ts                — NextAuth config + helpers
│   └── utils.ts               — cn() helper
├── middleware.ts               — role-based route protection
├── app/
│   ├── globals.css            — Tailwind directives + brand vars
│   ├── layout.tsx             — root layout (Inter font, providers)
│   ├── page.tsx               — redirect to /login
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx         — sidebar + topbar wrapper
│   │   ├── admin/page.tsx
│   │   ├── staff/page.tsx
│   │   ├── provider/page.tsx
│   │   ├── employer/page.tsx
│   │   ├── learner/page.tsx
│   │   └── jobseeker/page.tsx
│   └── api/
│       └── auth/
│           ├── [...nextauth]/route.ts
│           └── signup/route.ts
├── components/
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── StatCard.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── label.tsx
└── types/
    └── next-auth.d.ts         — session type augmentation
```

---

## Task 1: Project Scaffold & Dependencies

**Files:**
- Create: `package.json`, `.gitignore`, `.env`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `app/globals.css`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd "C:\Users\Sajjad Ali\Downloads\ed_fe"
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

Select defaults when prompted. This creates `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install prisma @prisma/client next-auth@5.0.0-beta.25 bcryptjs lucide-react clsx tailwind-merge
npm install -D @types/bcryptjs ts-node
```

- [ ] **Step 3: Update `tailwind.config.ts` with brand color**

Replace the content of `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#5B4FE8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 4: Update `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #F8F9FA;
  color: #1A1A2E;
}
```

- [ ] **Step 5: Create `.env`**

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="edvancefe-dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 6: Create `lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 7: Verify scaffold runs**

```bash
npm run dev
```

Expected: App starts on `http://localhost:3000` with default Next.js page. Stop the dev server after confirming.

- [ ] **Step 8: Initialize git and commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js 14 project with Tailwind and dependencies"
```

---

## Task 2: shadcn/ui Base Components

**Files:**
- Create: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/card.tsx`, `components/ui/label.tsx`

We create these manually (not via CLI) to avoid shadcn init complexity and keep control. These are minimal implementations matching shadcn patterns.

- [ ] **Step 1: Create `components/ui/button.tsx`**

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-white hover:bg-primary/90": variant === "default",
            "border border-gray-300 bg-white hover:bg-gray-50": variant === "outline",
            "hover:bg-gray-100": variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3 text-xs": size === "sm",
            "h-11 px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
```

- [ ] **Step 2: Create `components/ui/input.tsx`**

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
```

- [ ] **Step 3: Create `components/ui/card.tsx`**

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border border-gray-200 bg-white shadow-sm", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-gray-500", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardDescription, CardContent }
```

- [ ] **Step 4: Create `components/ui/label.tsx`**

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
      {...props}
    />
  )
)
Label.displayName = "Label"

export { Label }
```

- [ ] **Step 5: Commit**

```bash
git add components/ui/
git commit -m "feat: add shadcn-style UI base components (button, input, card, label)"
```

---

## Task 3: Prisma Schema & Database

**Files:**
- Create: `prisma/schema.prisma`, `lib/prisma.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

This creates `prisma/schema.prisma` and updates `.env` if needed.

- [ ] **Step 2: Write full Prisma schema**

Replace `prisma/schema.prisma` with the complete schema. All 18 models exactly as specified in the master prompt:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  role          Role
  name          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  isActive      Boolean   @default(true)

  employerProfile   EmployerProfile?
  jobSeekerProfile  JobSeekerProfile?
  learnerProfile    LearnerProfile?
  providerProfile   ProviderProfile?
  sentMessages      Message[]         @relation("SentMessages")
  notifications     Notification[]
  auditLogs         AuditLog[]
}

enum Role {
  SUPER_ADMIN
  INTERNAL_STAFF
  TRAINING_PROVIDER
  EMPLOYER
  LEARNER
  JOB_SEEKER
}

model EmployerProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])
  companyName     String
  companyLogo     String?
  industry        String?
  companySize     String?
  location        String?
  website         String?
  description     String?
  linkedIn        String?
  twitter         String?
  isVerified      Boolean   @default(false)
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  jobs            Job[]
  interviews      Interview[]
}

model JobSeekerProfile {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id])
  headline          String?
  bio               String?
  phone             String?
  location          String?
  photo             String?
  cvFile            String?
  cvText            String?
  skills            String    @default("[]")
  desiredRoles      String    @default("[]")
  desiredSalaryMin  Int?
  desiredSalaryMax  Int?
  desiredLocation   String?
  remotePreference  String?
  linkedIn          String?
  github            String?
  portfolio         String?
  profileComplete   Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  experiences       Experience[]
  educations        Education[]
  certificates      Certificate[]
  applications      Application[]
  matches           JobMatch[]
}

model LearnerProfile {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id])
  providerId        String
  provider          ProviderProfile   @relation(fields: [providerId], references: [id])
  cohortId          String?
  cohort            Cohort?   @relation(fields: [cohortId], references: [id])
  headline          String?
  bio               String?
  phone             String?
  location          String?
  photo             String?
  cvFile            String?
  cvText            String?
  skills            String    @default("[]")
  desiredRoles      String    @default("[]")
  desiredSalaryMin  Int?
  desiredSalaryMax  Int?
  desiredLocation   String?
  remotePreference  String?
  linkedIn          String?
  github            String?
  portfolio         String?
  courseName        String?
  courseSector      String?
  courseStartDate   DateTime?
  courseEndDate     DateTime?
  ragStatus         String    @default("GREEN")
  ms1Achieved       Boolean   @default(false)
  ms2Achieved       Boolean   @default(false)
  ms3Achieved       Boolean   @default(false)
  ms1Date           DateTime?
  ms2Date           DateTime?
  ms3Date           DateTime?
  profileComplete   Int       @default(0)
  credentialsSent   Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  experiences       Experience[]
  educations        Education[]
  certificates      Certificate[]
  applications      Application[]
  matches           JobMatch[]
}

model ProviderProfile {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])
  organisationName String
  logo            String?
  website         String?
  location        String?
  description     String?
  contactName     String?
  contactEmail    String?
  contactPhone    String?
  isActive        Boolean   @default(true)
  billingStatus   String    @default("ACTIVE")
  monthlyFee      Float     @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  learners        LearnerProfile[]
  courses         Course[]
  cohorts         Cohort[]
}

model Course {
  id              String    @id @default(cuid())
  providerId      String
  provider        ProviderProfile   @relation(fields: [providerId], references: [id])
  name            String
  sector          String
  requiredSkills  String    @default("[]")
  duration        String?
  description     String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  cohorts         Cohort[]
}

model Cohort {
  id                String    @id @default(cuid())
  providerId        String
  provider          ProviderProfile   @relation(fields: [providerId], references: [id])
  courseId          String
  course            Course    @relation(fields: [courseId], references: [id])
  name              String
  startDate         DateTime?
  endDate           DateTime?
  expectedLearners  Int       @default(0)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  learners          LearnerProfile[]
}

model Experience {
  id                String    @id @default(cuid())
  jobSeekerId       String?
  jobSeeker         JobSeekerProfile? @relation(fields: [jobSeekerId], references: [id])
  learnerId         String?
  learner           LearnerProfile?   @relation(fields: [learnerId], references: [id])
  title             String
  company           String
  location          String?
  startDate         DateTime?
  endDate           DateTime?
  current           Boolean   @default(false)
  description       String?
  createdAt         DateTime  @default(now())
}

model Education {
  id                String    @id @default(cuid())
  jobSeekerId       String?
  jobSeeker         JobSeekerProfile? @relation(fields: [jobSeekerId], references: [id])
  learnerId         String?
  learner           LearnerProfile?   @relation(fields: [learnerId], references: [id])
  institution       String
  degree            String?
  field             String?
  startDate         DateTime?
  endDate           DateTime?
  current           Boolean   @default(false)
  createdAt         DateTime  @default(now())
}

model Certificate {
  id                String    @id @default(cuid())
  jobSeekerId       String?
  jobSeeker         JobSeekerProfile? @relation(fields: [jobSeekerId], references: [id])
  learnerId         String?
  learner           LearnerProfile?   @relation(fields: [learnerId], references: [id])
  name              String
  issuer            String?
  issueDate         DateTime?
  fileUrl           String?
  createdAt         DateTime  @default(now())
}

model Job {
  id                String    @id @default(cuid())
  employerId        String?
  employer          EmployerProfile?  @relation(fields: [employerId], references: [id])
  title             String
  company           String
  location          String
  sector            String
  jobType           String?
  salaryMin         Int?
  salaryMax         Int?
  description       String
  requiredSkills    String    @default("[]")
  experienceLevel   String?
  deadline          DateTime?
  sourceType        String    @default("INTERNAL")
  sourceUrl         String?
  sourceBoardId     String?
  externalId        String?   @unique
  status            String    @default("ACTIVE")
  isRemote          Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  applications      Application[]
  matches           JobMatch[]
}

model JobMatch {
  id                String    @id @default(cuid())
  jobId             String
  job               Job       @relation(fields: [jobId], references: [id])
  jobSeekerId       String?
  jobSeeker         JobSeekerProfile? @relation(fields: [jobSeekerId], references: [id])
  learnerId         String?
  learner           LearnerProfile?   @relation(fields: [learnerId], references: [id])
  matchScore        Int
  matchedSkills     String    @default("[]")
  missingSkills     String    @default("[]")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Application {
  id                String    @id @default(cuid())
  jobId             String
  job               Job       @relation(fields: [jobId], references: [id])
  jobSeekerId       String?
  jobSeeker         JobSeekerProfile? @relation(fields: [jobSeekerId], references: [id])
  learnerId         String?
  learner           LearnerProfile?   @relation(fields: [learnerId], references: [id])
  status            String    @default("APPLIED")
  coverNote         String?
  matchScore        Int?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  messages          Message[]
  interviews        Interview[]
}

model Message {
  id                String    @id @default(cuid())
  applicationId     String
  application       Application @relation(fields: [applicationId], references: [id])
  senderId          String
  sender            User      @relation("SentMessages", fields: [senderId], references: [id])
  content           String
  createdAt         DateTime  @default(now())
  isRead            Boolean   @default(false)
}

model Interview {
  id                String    @id @default(cuid())
  applicationId     String
  application       Application @relation(fields: [applicationId], references: [id])
  employerId        String
  employer          EmployerProfile @relation(fields: [employerId], references: [id])
  proposedSlots     String    @default("[]")
  confirmedSlot     DateTime?
  status            String    @default("PENDING")
  location          String?
  meetingLink       String?
  notes             String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model JobBoard {
  id                String    @id @default(cuid())
  name              String
  boardType         String
  apiKey            String?
  feedUrl           String?
  genericUrl        String?
  schedule          String    @default("DAILY")
  isActive          Boolean   @default(true)
  lastFetchedAt     DateTime?
  lastJobCount      Int       @default(0)
  lastError         String?
  fieldMappings     String    @default("{}")
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model SystemSetting {
  id                String    @id @default(cuid())
  key               String    @unique
  value             String
  updatedAt         DateTime  @updatedAt
}

model Notification {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  title             String
  body              String
  type              String
  isRead            Boolean   @default(false)
  link              String?
  createdAt         DateTime  @default(now())
}

model AuditLog {
  id                String    @id @default(cuid())
  userId            String?
  user              User?     @relation(fields: [userId], references: [id])
  action            String
  entity            String
  entityId          String?
  detail            String?
  ipAddress         String?
  createdAt         DateTime  @default(now())
}
```

- [ ] **Step 3: Create `lib/prisma.ts`**

```typescript
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

- [ ] **Step 4: Generate Prisma client and run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration creates all tables. `prisma/migrations/` folder appears. `dev.db` file created.

- [ ] **Step 5: Commit**

```bash
git add prisma/ lib/prisma.ts
git commit -m "feat: add full Prisma schema with 18 models and SQLite migration"
```

---

## Task 4: Seed Data

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add prisma seed config)

- [ ] **Step 1: Add seed script config to `package.json`**

Add to `package.json`:

```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

- [ ] **Step 2: Create `prisma/seed.ts`**

```typescript
import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Clean existing data
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.message.deleteMany()
  await prisma.interview.deleteMany()
  await prisma.application.deleteMany()
  await prisma.jobMatch.deleteMany()
  await prisma.job.deleteMany()
  await prisma.certificate.deleteMany()
  await prisma.education.deleteMany()
  await prisma.experience.deleteMany()
  await prisma.learnerProfile.deleteMany()
  await prisma.cohort.deleteMany()
  await prisma.course.deleteMany()
  await prisma.jobSeekerProfile.deleteMany()
  await prisma.employerProfile.deleteMany()
  await prisma.providerProfile.deleteMany()
  await prisma.jobBoard.deleteMany()
  await prisma.systemSetting.deleteMany()
  await prisma.user.deleteMany()

  // --- Users ---
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@edvancefe.com",
      password: await bcrypt.hash("Admin@1234", 10),
      role: Role.SUPER_ADMIN,
      name: "System Admin",
    },
  })

  const staffUser = await prisma.user.create({
    data: {
      email: "staff@edvancefe.com",
      password: await bcrypt.hash("Staff@1234", 10),
      role: Role.INTERNAL_STAFF,
      name: "Sarah Johnson",
    },
  })

  const providerUser = await prisma.user.create({
    data: {
      email: "provider@codeinstitute.com",
      password: await bcrypt.hash("Provider@1234", 10),
      role: Role.TRAINING_PROVIDER,
      name: "James Wilson",
    },
  })

  const employerUser = await prisma.user.create({
    data: {
      email: "employer@techcorp.com",
      password: await bcrypt.hash("Employer@1234", 10),
      role: Role.EMPLOYER,
      name: "Emma Davies",
    },
  })

  const learnerUser = await prisma.user.create({
    data: {
      email: "learner@edvancefe.com",
      password: await bcrypt.hash("Learner@1234", 10),
      role: Role.LEARNER,
      name: "Alex Thompson",
    },
  })

  const seekerUser = await prisma.user.create({
    data: {
      email: "seeker@edvancefe.com",
      password: await bcrypt.hash("Seeker@1234", 10),
      role: Role.JOB_SEEKER,
      name: "Maria Garcia",
    },
  })

  // --- Provider Profile ---
  const provider = await prisma.providerProfile.create({
    data: {
      userId: providerUser.id,
      organisationName: "Code Institute",
      website: "https://codeinstitute.net",
      location: "London",
      description: "Leading provider of funded skills training in Health & Social Care",
      contactName: "James Wilson",
      contactEmail: "provider@codeinstitute.com",
      contactPhone: "020 7123 4567",
      monthlyFee: 500,
    },
  })

  // --- Employer Profile ---
  const employer = await prisma.employerProfile.create({
    data: {
      userId: employerUser.id,
      companyName: "TechCorp Ltd",
      industry: "Technology",
      companySize: "50-200",
      location: "Manchester",
      website: "https://techcorp.example.com",
      description: "Leading technology solutions provider in the UK",
      isVerified: true,
    },
  })

  // --- Course & Cohort ---
  const course = await prisma.course.create({
    data: {
      providerId: provider.id,
      name: "Health & Social Care Level 3",
      sector: "Health & Social Care",
      requiredSkills: JSON.stringify(["patient care", "communication", "healthcare", "care plan"]),
      duration: "12 months",
      description: "Comprehensive training in health and social care delivery",
    },
  })

  const cohort = await prisma.cohort.create({
    data: {
      providerId: provider.id,
      courseId: course.id,
      name: "January 2026 Intake",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2027-01-15"),
      expectedLearners: 20,
    },
  })

  // --- Learner Profiles (3 learners) ---
  const learner1 = await prisma.learnerProfile.create({
    data: {
      userId: learnerUser.id,
      providerId: provider.id,
      cohortId: cohort.id,
      headline: "Aspiring Healthcare Professional",
      phone: "07700 900001",
      location: "London",
      skills: JSON.stringify(["patient care", "communication", "teamwork"]),
      desiredRoles: JSON.stringify(["Care Worker", "Healthcare Assistant"]),
      courseName: "Health & Social Care Level 3",
      courseSector: "Health & Social Care",
      courseStartDate: new Date("2026-01-15"),
      courseEndDate: new Date("2027-01-15"),
      ragStatus: "GREEN",
      ms1Achieved: true,
      ms1Date: new Date("2026-03-01"),
      profileComplete: 65,
    },
  })

  // Additional learner users for the provider's roster
  const learnerUser2 = await prisma.user.create({
    data: {
      email: "learner2@edvancefe.com",
      password: await bcrypt.hash("Learner@1234", 10),
      role: Role.LEARNER,
      name: "Ben Carter",
    },
  })

  const learner2 = await prisma.learnerProfile.create({
    data: {
      userId: learnerUser2.id,
      providerId: provider.id,
      cohortId: cohort.id,
      headline: "Healthcare Student",
      phone: "07700 900002",
      location: "Birmingham",
      skills: JSON.stringify(["communication", "teamwork", "problem solving"]),
      desiredRoles: JSON.stringify(["Support Worker"]),
      courseName: "Health & Social Care Level 3",
      courseSector: "Health & Social Care",
      courseStartDate: new Date("2026-01-15"),
      courseEndDate: new Date("2027-01-15"),
      ragStatus: "AMBER",
      ms1Achieved: true,
      ms1Date: new Date("2026-03-15"),
      ms2Achieved: true,
      ms2Date: new Date("2026-05-01"),
      profileComplete: 80,
    },
  })

  const learnerUser3 = await prisma.user.create({
    data: {
      email: "learner3@edvancefe.com",
      password: await bcrypt.hash("Learner@1234", 10),
      role: Role.LEARNER,
      name: "Claire Donovan",
    },
  })

  const learner3 = await prisma.learnerProfile.create({
    data: {
      userId: learnerUser3.id,
      providerId: provider.id,
      cohortId: cohort.id,
      headline: "Care Sector Trainee",
      phone: "07700 900003",
      location: "Leeds",
      skills: JSON.stringify(["patient care", "clinical", "healthcare", "care plan"]),
      desiredRoles: JSON.stringify(["Healthcare Assistant", "Care Coordinator"]),
      courseName: "Health & Social Care Level 3",
      courseSector: "Health & Social Care",
      courseStartDate: new Date("2026-01-15"),
      courseEndDate: new Date("2027-01-15"),
      ragStatus: "RED",
      ms1Achieved: true,
      ms1Date: new Date("2026-02-20"),
      profileComplete: 45,
    },
  })

  // --- Job Seeker Profile ---
  const jobSeeker = await prisma.jobSeekerProfile.create({
    data: {
      userId: seekerUser.id,
      headline: "Full Stack Developer",
      bio: "Experienced developer looking for new opportunities",
      phone: "07700 900004",
      location: "Manchester",
      skills: JSON.stringify(["javascript", "typescript", "react", "node", "sql", "git"]),
      desiredRoles: JSON.stringify(["Full Stack Developer", "Frontend Developer"]),
      desiredSalaryMin: 35000,
      desiredSalaryMax: 55000,
      desiredLocation: "Manchester",
      remotePreference: "HYBRID",
      profileComplete: 75,
    },
  })

  // --- Jobs (10 total: 3 Health & Social Care, 7 other sectors) ---
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        employerId: employer.id,
        title: "Healthcare Assistant",
        company: "NHS Trust Manchester",
        location: "Manchester",
        sector: "Health & Social Care",
        jobType: "FULL_TIME",
        salaryMin: 22000,
        salaryMax: 28000,
        description: "Provide direct patient care in a hospital setting. Support nursing staff with clinical duties and patient wellbeing.",
        requiredSkills: JSON.stringify(["patient care", "communication", "healthcare", "teamwork"]),
        experienceLevel: "ENTRY",
        sourceType: "INTERNAL",
        externalId: "int-hca-001",
        status: "ACTIVE",
      },
    }),
    prisma.job.create({
      data: {
        title: "Care Worker",
        company: "Sunrise Care Homes",
        location: "London",
        sector: "Health & Social Care",
        jobType: "FULL_TIME",
        salaryMin: 20000,
        salaryMax: 25000,
        description: "Support residents with daily activities and personal care in a residential care home setting.",
        requiredSkills: JSON.stringify(["patient care", "care plan", "communication"]),
        experienceLevel: "ENTRY",
        sourceType: "REED",
        sourceUrl: "https://www.reed.co.uk/jobs/care-worker",
        externalId: "reed-cw-001",
        status: "ACTIVE",
      },
    }),
    prisma.job.create({
      data: {
        title: "Clinical Support Officer",
        company: "HealthFirst UK",
        location: "Birmingham",
        sector: "Health & Social Care",
        jobType: "FULL_TIME",
        salaryMin: 25000,
        salaryMax: 32000,
        description: "Provide clinical and administrative support within a healthcare environment.",
        requiredSkills: JSON.stringify(["clinical", "healthcare", "communication", "nhs"]),
        experienceLevel: "MID",
        sourceType: "ADZUNA",
        sourceUrl: "https://www.adzuna.co.uk/jobs/clinical-support",
        externalId: "adz-cso-001",
        status: "ACTIVE",
      },
    }),
    prisma.job.create({
      data: {
        employerId: employer.id,
        title: "Full Stack Developer",
        company: "TechCorp Ltd",
        location: "Manchester",
        sector: "Technology",
        jobType: "FULL_TIME",
        salaryMin: 40000,
        salaryMax: 55000,
        description: "Build and maintain web applications using React and Node.js in an agile team.",
        requiredSkills: JSON.stringify(["javascript", "typescript", "react", "node", "sql"]),
        experienceLevel: "MID",
        sourceType: "INTERNAL",
        externalId: "int-fsd-001",
        status: "ACTIVE",
      },
    }),
    prisma.job.create({
      data: {
        employerId: employer.id,
        title: "Junior Data Analyst",
        company: "TechCorp Ltd",
        location: "Manchester",
        sector: "Technology",
        jobType: "FULL_TIME",
        salaryMin: 28000,
        salaryMax: 35000,
        description: "Analyse business data, create reports and dashboards to support decision-making.",
        requiredSkills: JSON.stringify(["sql", "python", "excel", "data"]),
        experienceLevel: "ENTRY",
        sourceType: "INTERNAL",
        externalId: "int-jda-001",
        status: "ACTIVE",
      },
    }),
    prisma.job.create({
      data: {
        title: "Marketing Coordinator",
        company: "BrandWorks Agency",
        location: "London",
        sector: "Marketing & Sales",
        jobType: "FULL_TIME",
        salaryMin: 26000,
        salaryMax: 32000,
        description: "Coordinate marketing campaigns across digital and traditional channels.",
        requiredSkills: JSON.stringify(["marketing", "digital", "communication", "content"]),
        experienceLevel: "ENTRY",
        sourceType: "REED",
        sourceUrl: "https://www.reed.co.uk/jobs/marketing-coordinator",
        externalId: "reed-mc-001",
        status: "ACTIVE",
      },
    }),
    prisma.job.create({
      data: {
        title: "Site Manager",
        company: "BuildRight Construction",
        location: "Leeds",
        sector: "Construction",
        jobType: "FULL_TIME",
        salaryMin: 45000,
        salaryMax: 55000,
        description: "Manage construction site operations, ensuring safety compliance and project delivery.",
        requiredSkills: JSON.stringify(["site management", "health and safety", "building regulations"]),
        experienceLevel: "SENIOR",
        sourceType: "ADZUNA",
        sourceUrl: "https://www.adzuna.co.uk/jobs/site-manager",
        externalId: "adz-sm-001",
        status: "ACTIVE",
      },
    }),
    prisma.job.create({
      data: {
        title: "Teaching Assistant",
        company: "Greenfield Academy",
        location: "Bristol",
        sector: "Education",
        jobType: "PART_TIME",
        salaryMin: 18000,
        salaryMax: 22000,
        description: "Support classroom teachers in delivering lessons and managing student activities.",
        requiredSkills: JSON.stringify(["education", "communication", "teamwork"]),
        experienceLevel: "ENTRY",
        sourceType: "REED",
        sourceUrl: "https://www.reed.co.uk/jobs/teaching-assistant",
        externalId: "reed-ta-001",
        status: "ACTIVE",
      },
    }),
    prisma.job.create({
      data: {
        title: "Warehouse Operative",
        company: "FastFreight Logistics",
        location: "Sheffield",
        sector: "Logistics",
        jobType: "FULL_TIME",
        salaryMin: 22000,
        salaryMax: 26000,
        description: "Pick, pack and dispatch orders in a busy warehouse environment.",
        requiredSkills: JSON.stringify(["warehouse", "logistics"]),
        experienceLevel: "ENTRY",
        sourceType: "ADZUNA",
        sourceUrl: "https://www.adzuna.co.uk/jobs/warehouse",
        externalId: "adz-wo-001",
        status: "ACTIVE",
      },
    }),
    prisma.job.create({
      data: {
        title: "Finance Assistant",
        company: "MoneySmart Advisors",
        location: "Edinburgh",
        sector: "Finance",
        jobType: "FULL_TIME",
        salaryMin: 24000,
        salaryMax: 30000,
        description: "Support the finance team with bookkeeping, invoicing and financial reporting.",
        requiredSkills: JSON.stringify(["finance", "excel", "accountan"]),
        experienceLevel: "ENTRY",
        sourceType: "INTERNAL",
        externalId: "int-fa-001",
        status: "CLOSED",
      },
    }),
  ])

  // --- Job Matches ---
  // Learner 1 matches with Health & Social Care jobs
  await prisma.jobMatch.create({
    data: {
      jobId: jobs[0].id, // Healthcare Assistant
      learnerId: learner1.id,
      matchScore: 72,
      matchedSkills: JSON.stringify(["patient care", "communication", "teamwork"]),
      missingSkills: JSON.stringify(["healthcare"]),
    },
  })
  await prisma.jobMatch.create({
    data: {
      jobId: jobs[1].id, // Care Worker
      learnerId: learner1.id,
      matchScore: 58,
      matchedSkills: JSON.stringify(["patient care", "communication"]),
      missingSkills: JSON.stringify(["care plan"]),
    },
  })

  // Learner 3 matches
  await prisma.jobMatch.create({
    data: {
      jobId: jobs[0].id,
      learnerId: learner3.id,
      matchScore: 85,
      matchedSkills: JSON.stringify(["patient care", "clinical", "healthcare"]),
      missingSkills: JSON.stringify([]),
    },
  })
  await prisma.jobMatch.create({
    data: {
      jobId: jobs[2].id,
      learnerId: learner3.id,
      matchScore: 90,
      matchedSkills: JSON.stringify(["clinical", "healthcare", "care plan"]),
      missingSkills: JSON.stringify(["nhs"]),
    },
  })

  // Job seeker matches with tech jobs
  await prisma.jobMatch.create({
    data: {
      jobId: jobs[3].id, // Full Stack Developer
      jobSeekerId: jobSeeker.id,
      matchScore: 88,
      matchedSkills: JSON.stringify(["javascript", "typescript", "react", "node", "sql"]),
      missingSkills: JSON.stringify([]),
    },
  })
  await prisma.jobMatch.create({
    data: {
      jobId: jobs[4].id, // Junior Data Analyst
      jobSeekerId: jobSeeker.id,
      matchScore: 45,
      matchedSkills: JSON.stringify(["sql"]),
      missingSkills: JSON.stringify(["python", "excel", "data"]),
    },
  })

  // --- Applications (2 with message threads) ---
  const app1 = await prisma.application.create({
    data: {
      jobId: jobs[0].id, // Healthcare Assistant
      learnerId: learner1.id,
      status: "SHORTLISTED",
      coverNote: "I am passionate about healthcare and have been training in this field.",
      matchScore: 72,
    },
  })

  const app2 = await prisma.application.create({
    data: {
      jobId: jobs[3].id, // Full Stack Developer
      jobSeekerId: jobSeeker.id,
      status: "APPLIED",
      coverNote: "Experienced developer with strong React and Node.js skills.",
      matchScore: 88,
    },
  })

  // --- Messages ---
  await prisma.message.create({
    data: {
      applicationId: app1.id,
      senderId: employerUser.id,
      content: "Thank you for your application. We would like to invite you for an interview.",
      isRead: true,
    },
  })
  await prisma.message.create({
    data: {
      applicationId: app1.id,
      senderId: learnerUser.id,
      content: "Thank you! I am available any time next week.",
      isRead: false,
    },
  })
  await prisma.message.create({
    data: {
      applicationId: app2.id,
      senderId: seekerUser.id,
      content: "Hi, I wanted to follow up on my application. Looking forward to hearing from you.",
      isRead: false,
    },
  })

  // --- Interview ---
  await prisma.interview.create({
    data: {
      applicationId: app1.id,
      employerId: employer.id,
      proposedSlots: JSON.stringify([
        "2026-07-10T10:00:00Z",
        "2026-07-11T14:00:00Z",
        "2026-07-12T09:00:00Z",
      ]),
      status: "PENDING",
      location: "NHS Trust Manchester, Building A",
    },
  })

  // --- Job Board (Reed, inactive) ---
  await prisma.jobBoard.create({
    data: {
      name: "Reed",
      boardType: "REED",
      apiKey: "",
      schedule: "DAILY",
      isActive: false,
      lastJobCount: 0,
    },
  })

  // --- System Settings ---
  await prisma.systemSetting.create({
    data: {
      key: "min_match_threshold",
      value: "40",
    },
  })

  // --- Notifications ---
  await prisma.notification.create({
    data: {
      userId: learnerUser.id,
      title: "Application Shortlisted",
      body: "Your application for Healthcare Assistant has been shortlisted.",
      type: "APPLICATION_UPDATE",
      link: "/learner/applications",
      isRead: false,
    },
  })
  await prisma.notification.create({
    data: {
      userId: employerUser.id,
      title: "New Application Received",
      body: "Maria Garcia applied for Full Stack Developer.",
      type: "NEW_APPLICATION",
      link: "/employer/applications",
      isRead: false,
    },
  })

  // --- Audit Logs ---
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: "CREATE",
      entity: "User",
      entityId: providerUser.id,
      detail: "Created training provider account for Code Institute",
    },
  })
  await prisma.auditLog.create({
    data: {
      userId: providerUser.id,
      action: "CREATE",
      entity: "LearnerProfile",
      entityId: learner1.id,
      detail: "Enrolled learner Alex Thompson in Health & Social Care Level 3",
    },
  })
  await prisma.auditLog.create({
    data: {
      userId: employerUser.id,
      action: "CREATE",
      entity: "Job",
      entityId: jobs[0].id,
      detail: "Posted Healthcare Assistant position",
    },
  })
  await prisma.auditLog.create({
    data: {
      userId: employerUser.id,
      action: "UPDATE",
      entity: "Application",
      entityId: app1.id,
      detail: "Shortlisted application from Alex Thompson",
    },
  })

  console.log("Seed completed successfully")
  console.log("---")
  console.log("Login credentials:")
  console.log("  Admin:    admin@edvancefe.com / Admin@1234")
  console.log("  Staff:    staff@edvancefe.com / Staff@1234")
  console.log("  Provider: provider@codeinstitute.com / Provider@1234")
  console.log("  Employer: employer@techcorp.com / Employer@1234")
  console.log("  Learner:  learner@edvancefe.com / Learner@1234")
  console.log("  Seeker:   seeker@edvancefe.com / Seeker@1234")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

- [ ] **Step 3: Run seed**

```bash
npx prisma db seed
```

Expected: "Seed completed successfully" with credentials printed.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add comprehensive seed data for all 6 roles"
```

---

## Task 5: NextAuth Configuration

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `types/next-auth.d.ts`

- [ ] **Step 1: Create `types/next-auth.d.ts`**

```typescript
import { Role } from "@prisma/client"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      email: string
      name: string
    } & DefaultSession["user"]
  }

  interface User {
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
  }
}
```

- [ ] **Step 2: Create `lib/auth.ts`**

```typescript
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.isActive) {
          throw new Error("Invalid email or password")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error("Invalid email or password")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || "",
          role: user.role,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role as Role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}

export function getRoleRedirect(role: Role): string {
  const redirects: Record<Role, string> = {
    SUPER_ADMIN: "/admin",
    INTERNAL_STAFF: "/staff",
    TRAINING_PROVIDER: "/provider",
    EMPLOYER: "/employer",
    LEARNER: "/learner",
    JOB_SEEKER: "/jobseeker",
  }
  return redirects[role] || "/login"
}
```

- [ ] **Step 3: Create `app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

- [ ] **Step 4: Verify auth compiles**

```bash
npx tsc --noEmit
```

Expected: No type errors. If there are warnings about unused variables from the scaffold, those are acceptable.

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts app/api/auth/ types/
git commit -m "feat: configure NextAuth v5 with credentials provider and role-based JWT"
```

---

## Task 6: Middleware — Role-Based Route Protection

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create `middleware.ts`**

```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const roleRouteMap: Record<string, string[]> = {
  "/admin": ["SUPER_ADMIN"],
  "/staff": ["INTERNAL_STAFF", "SUPER_ADMIN"],
  "/provider": ["TRAINING_PROVIDER", "SUPER_ADMIN"],
  "/employer": ["EMPLOYER", "SUPER_ADMIN"],
  "/learner": ["LEARNER"],
  "/jobseeker": ["JOB_SEEKER"],
}

const roleDashboardMap: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  INTERNAL_STAFF: "/staff",
  TRAINING_PROVIDER: "/provider",
  EMPLOYER: "/employer",
  LEARNER: "/learner",
  JOB_SEEKER: "/jobseeker",
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = await getToken({ req: request })

  // Public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    // Redirect logged-in users away from auth pages
    if (token && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
      const dashboard = roleDashboardMap[token.role as string] || "/login"
      return NextResponse.redirect(new URL(dashboard, request.url))
    }
    return NextResponse.next()
  }

  // Root redirect
  if (pathname === "/") {
    if (token) {
      const dashboard = roleDashboardMap[token.role as string] || "/login"
      return NextResponse.redirect(new URL(dashboard, request.url))
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Protected routes — must be logged in
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Check role access
  for (const [routePrefix, allowedRoles] of Object.entries(roleRouteMap)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(token.role as string)) {
        const dashboard = roleDashboardMap[token.role as string] || "/login"
        return NextResponse.redirect(new URL(dashboard, request.url))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add role-based middleware with route protection and redirects"
```

---

## Task 7: Login Page

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Modify: `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

Replace the content:

```typescript
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EdvanceFE — Smarter Progression Management",
  description: "Outcome Management System and job matching platform for UK funded skills provision",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Update `app/page.tsx`**

```typescript
import { redirect } from "next/navigation"

export default function Home() {
  redirect("/login")
}
```

- [ ] **Step 3: Create `app/(auth)/login/page.tsx`**

```typescript
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogIn, AlertCircle } from "lucide-react"

const roleRedirects: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  INTERNAL_STAFF: "/staff",
  TRAINING_PROVIDER: "/provider",
  EMPLOYER: "/employer",
  LEARNER: "/learner",
  JOB_SEEKER: "/jobseeker",
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
      return
    }

    // Fetch session to get role for redirect
    const res = await fetch("/api/auth/session")
    const session = await res.json()
    const role = session?.user?.role
    const redirectUrl = roleRedirects[role] || "/login"
    router.push(redirectUrl)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2 pb-2">
          <h1 className="text-3xl font-bold text-primary">EdvanceFE</h1>
          <p className="text-gray-500 text-sm">Smarter Progression Management</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign in
                </>
              )}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Verify login page renders**

```bash
npm run dev
```

Navigate to `http://localhost:3000/login`. Expected: EdvanceFE branded login card with email/password fields and sign in button.

- [ ] **Step 5: Test login with seed credentials**

Enter `admin@edvancefe.com` / `Admin@1234`. Expected: Redirects to `/admin` (which will 404 for now — that's fine, we'll build it in Task 9).

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/page.tsx app/(auth)/login/
git commit -m "feat: add login page with NextAuth credentials sign-in"
```

---

## Task 8: Signup Page & API

**Files:**
- Create: `app/(auth)/signup/page.tsx`, `app/api/auth/signup/route.ts`

- [ ] **Step 1: Create `app/api/auth/signup/route.ts`**

```typescript
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, role, ...profileData } = body

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const allowedRoles: Role[] = [Role.JOB_SEEKER, Role.EMPLOYER, Role.TRAINING_PROVIDER]
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role for public signup" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    })

    // Create role-specific profile
    if (role === Role.EMPLOYER) {
      await prisma.employerProfile.create({
        data: {
          userId: user.id,
          companyName: profileData.companyName || "",
          industry: profileData.industry || null,
          location: profileData.location || null,
        },
      })
    } else if (role === Role.JOB_SEEKER) {
      await prisma.jobSeekerProfile.create({
        data: {
          userId: user.id,
        },
      })
    } else if (role === Role.TRAINING_PROVIDER) {
      await prisma.providerProfile.create({
        data: {
          userId: user.id,
          organisationName: profileData.organisationName || "",
          contactName: profileData.contactName || name,
          contactPhone: profileData.contactPhone || null,
        },
      })
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        entity: "User",
        entityId: user.id,
        detail: `New ${role} account created via signup`,
      },
    })

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create `app/(auth)/signup/page.tsx`**

```typescript
"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Briefcase, GraduationCap, Building2, ArrowLeft, AlertCircle, UserPlus } from "lucide-react"

type SignupRole = "JOB_SEEKER" | "EMPLOYER" | "TRAINING_PROVIDER"

const roleCards: { role: SignupRole; title: string; description: string; icon: React.ReactNode }[] = [
  {
    role: "JOB_SEEKER",
    title: "Job Seeker",
    description: "Find your next role",
    icon: <Briefcase className="h-8 w-8" />,
  },
  {
    role: "EMPLOYER",
    title: "Employer",
    description: "Hire from funded talent pools",
    icon: <Building2 className="h-8 w-8" />,
  },
  {
    role: "TRAINING_PROVIDER",
    title: "Training Provider",
    description: "Manage your learners",
    icon: <GraduationCap className="h-8 w-8" />,
  },
]

const roleRedirects: Record<string, string> = {
  EMPLOYER: "/employer",
  JOB_SEEKER: "/jobseeker",
  TRAINING_PROVIDER: "/provider",
}

export default function SignupPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<SignupRole | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Employer fields
  const [companyName, setCompanyName] = useState("")
  const [industry, setIndustry] = useState("")
  const [companyLocation, setCompanyLocation] = useState("")

  // Provider fields
  const [organisationName, setOrganisationName] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    const payload: Record<string, string> = {
      name,
      email,
      password,
      role: selectedRole!,
    }

    if (selectedRole === "EMPLOYER") {
      payload.companyName = companyName
      payload.industry = industry
      payload.location = companyLocation
    } else if (selectedRole === "TRAINING_PROVIDER") {
      payload.organisationName = organisationName
      payload.contactName = contactName || name
      payload.contactPhone = contactPhone
    }

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Signup failed")
      setLoading(false)
      return
    }

    // Auto-login
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (signInResult?.error) {
      setError("Account created but auto-login failed. Please log in manually.")
      setLoading(false)
      return
    }

    router.push(roleRedirects[selectedRole!] || "/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2 pb-2">
          <h1 className="text-3xl font-bold text-primary">EdvanceFE</h1>
          <p className="text-gray-500 text-sm">Create your account</p>
        </CardHeader>
        <CardContent>
          {!selectedRole ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center mb-4">I want to join as a...</p>
              {roleCards.map((rc) => (
                <button
                  key={rc.role}
                  onClick={() => setSelectedRole(rc.role)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="text-primary">{rc.icon}</div>
                  <div>
                    <p className="font-semibold text-[#1A1A2E]">{rc.title}</p>
                    <p className="text-sm text-gray-500">{rc.description}</p>
                  </div>
                </button>
              ))}
              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Change role
              </button>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>

              {selectedRole === "EMPLOYER" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyLocation">Location</Label>
                    <Input id="companyLocation" value={companyLocation} onChange={(e) => setCompanyLocation(e.target.value)} />
                  </div>
                </>
              )}

              {selectedRole === "TRAINING_PROVIDER" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="organisationName">Organisation Name</Label>
                    <Input id="organisationName" value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone</Label>
                    <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  "Creating account..."
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create account
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Verify signup flow**

```bash
npm run dev
```

Navigate to `/signup`. Expected: Role selector with 3 cards. Click "Job Seeker" → form appears. Fill in details, submit → redirects to `/jobseeker`.

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/signup/ app/api/auth/signup/
git commit -m "feat: add signup page with role selector and role-specific forms"
```

---

## Task 9: Dashboard Layout (Sidebar + TopBar)

**Files:**
- Create: `components/dashboard/Sidebar.tsx`, `components/dashboard/TopBar.tsx`, `components/dashboard/StatCard.tsx`, `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create `components/dashboard/Sidebar.tsx`**

```typescript
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Briefcase, Settings, BarChart3, FileText, MessageSquare,
  Building2, GraduationCap, UserCheck, ClipboardList, Search, Target, Bell,
  BookOpen, FolderOpen, Shield, LogOut, Menu, X, ChevronDown
} from "lucide-react"
import type { Role } from "@prisma/client"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const navByRole: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { label: "Overview", href: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Providers", href: "/admin/providers", icon: <GraduationCap className="h-5 w-5" /> },
    { label: "Employers", href: "/admin/employers", icon: <Building2 className="h-5 w-5" /> },
    { label: "Jobs", href: "/admin/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Users", href: "/admin/users", icon: <Users className="h-5 w-5" /> },
    { label: "Scraper", href: "/admin/scraper", icon: <Search className="h-5 w-5" /> },
    { label: "Matching", href: "/admin/matching", icon: <Target className="h-5 w-5" /> },
    { label: "Messages", href: "/admin/messages", icon: <MessageSquare className="h-5 w-5" /> },
    { label: "Audit Log", href: "/admin/audit", icon: <Shield className="h-5 w-5" /> },
    { label: "Analytics", href: "/admin/analytics", icon: <BarChart3 className="h-5 w-5" /> },
    { label: "Settings", href: "/admin/settings", icon: <Settings className="h-5 w-5" /> },
  ],
  INTERNAL_STAFF: [
    { label: "Overview", href: "/staff", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Candidates", href: "/staff/candidates", icon: <Users className="h-5 w-5" /> },
    { label: "Jobs", href: "/staff/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Pipeline", href: "/staff/pipeline", icon: <ClipboardList className="h-5 w-5" /> },
    { label: "Matching", href: "/staff/matching", icon: <Target className="h-5 w-5" /> },
    { label: "Analytics", href: "/staff/analytics", icon: <BarChart3 className="h-5 w-5" /> },
  ],
  TRAINING_PROVIDER: [
    { label: "Overview", href: "/provider", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Learners", href: "/provider/learners", icon: <Users className="h-5 w-5" /> },
    { label: "Courses", href: "/provider/courses", icon: <BookOpen className="h-5 w-5" /> },
    { label: "Cohorts", href: "/provider/cohorts", icon: <FolderOpen className="h-5 w-5" /> },
    { label: "Messages", href: "/provider/messages", icon: <MessageSquare className="h-5 w-5" /> },
    { label: "Analytics", href: "/provider/analytics", icon: <BarChart3 className="h-5 w-5" /> },
  ],
  EMPLOYER: [
    { label: "Overview", href: "/employer", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Profile", href: "/employer/profile", icon: <Building2 className="h-5 w-5" /> },
    { label: "Jobs", href: "/employer/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Applications", href: "/employer/applications", icon: <FileText className="h-5 w-5" /> },
    { label: "Interviews", href: "/employer/interviews", icon: <UserCheck className="h-5 w-5" /> },
    { label: "Messages", href: "/employer/messages", icon: <MessageSquare className="h-5 w-5" /> },
    { label: "Analytics", href: "/employer/analytics", icon: <BarChart3 className="h-5 w-5" /> },
  ],
  LEARNER: [
    { label: "Overview", href: "/learner", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Profile", href: "/learner/profile", icon: <Users className="h-5 w-5" /> },
    { label: "Jobs", href: "/learner/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Applications", href: "/learner/applications", icon: <FileText className="h-5 w-5" /> },
    { label: "Messages", href: "/learner/messages", icon: <MessageSquare className="h-5 w-5" /> },
  ],
  JOB_SEEKER: [
    { label: "Overview", href: "/jobseeker", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Profile", href: "/jobseeker/profile", icon: <Users className="h-5 w-5" /> },
    { label: "Jobs", href: "/jobseeker/jobs", icon: <Briefcase className="h-5 w-5" /> },
    { label: "Applications", href: "/jobseeker/applications", icon: <FileText className="h-5 w-5" /> },
    { label: "Messages", href: "/jobseeker/messages", icon: <MessageSquare className="h-5 w-5" /> },
  ],
}

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  INTERNAL_STAFF: "Internal Staff",
  TRAINING_PROVIDER: "Training Provider",
  EMPLOYER: "Employer",
  LEARNER: "Learner",
  JOB_SEEKER: "Job Seeker",
}

interface SidebarProps {
  role: Role
  userName: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = navByRole[role] || []

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-primary">EdvanceFE</h1>
        <p className="text-xs text-gray-400 mt-1">{roleLabels[role]}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== navItems[0].href && pathname.startsWith(item.href + "/"))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-[#1A1A2E]"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {userName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1A1A2E] truncate">{userName}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-colors w-full mt-1"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-white shadow-md"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:min-h-screen bg-white border-r border-gray-200">
        {sidebarContent}
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Create `components/dashboard/TopBar.tsx`**

```typescript
"use client"

import { Bell } from "lucide-react"

interface TopBarProps {
  title: string
  notificationCount?: number
}

export function TopBar({ title, notificationCount = 0 }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-[#1A1A2E] md:ml-0 ml-12">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5 text-gray-500" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Create `components/dashboard/StatCard.tsx`**

```typescript
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  color?: string
}

export function StatCard({ title, value, icon, description, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-[#1A1A2E] mt-1">{value}</p>
            {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
          </div>
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${color || "bg-primary/10 text-primary"}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create `app/(dashboard)/layout.tsx`**

This is a server component that gets the session and passes role/name to the sidebar.

```typescript
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { Sidebar } from "@/components/dashboard/Sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FA]">
      <Sidebar role={session.user.role} userName={session.user.name || ""} />
      <main className="flex-1 flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/ app/(dashboard)/layout.tsx
git commit -m "feat: add dashboard layout with role-based sidebar, topbar, and stat cards"
```

---

## Task 10: Dashboard Overview Pages (All 6 Roles)

**Files:**
- Create: `app/(dashboard)/admin/page.tsx`, `app/(dashboard)/staff/page.tsx`, `app/(dashboard)/provider/page.tsx`, `app/(dashboard)/employer/page.tsx`, `app/(dashboard)/learner/page.tsx`, `app/(dashboard)/jobseeker/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/admin/page.tsx`**

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { Building2, Briefcase, Users, GraduationCap, Search } from "lucide-react"

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  const [providerCount, employerCount, learnerCount, seekerCount, jobCount, notifications] = await Promise.all([
    prisma.providerProfile.count(),
    prisma.employerProfile.count(),
    prisma.learnerProfile.count(),
    prisma.jobSeekerProfile.count(),
    prisma.job.count(),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  return (
    <>
      <TopBar title="Admin Overview" notificationCount={notifications} />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard title="Providers" value={providerCount} icon={<GraduationCap className="h-6 w-6" />} />
          <StatCard title="Employers" value={employerCount} icon={<Building2 className="h-6 w-6" />} />
          <StatCard title="Learners" value={learnerCount} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Job Seekers" value={seekerCount} icon={<Search className="h-6 w-6" />} />
          <StatCard title="Total Jobs" value={jobCount} icon={<Briefcase className="h-6 w-6" />} />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/staff/page.tsx`**

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { Users, Briefcase, Target } from "lucide-react"

export default async function StaffDashboard() {
  const session = await getServerSession(authOptions)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [candidateCount, jobsToday, matchesToday, notifications] = await Promise.all([
    prisma.jobSeekerProfile.count().then(async (seekers) => {
      const learners = await prisma.learnerProfile.count()
      return seekers + learners
    }),
    prisma.job.count({ where: { createdAt: { gte: today } } }),
    prisma.jobMatch.count({ where: { createdAt: { gte: today } } }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  return (
    <>
      <TopBar title="Staff Overview" notificationCount={notifications} />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Active Candidates" value={candidateCount} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Jobs Today" value={jobsToday} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Matches Today" value={matchesToday} icon={<Target className="h-6 w-6" />} />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/provider/page.tsx`**

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { Users, UserCheck, Award, AlertTriangle } from "lucide-react"

export default async function ProviderDashboard() {
  const session = await getServerSession(authOptions)

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session!.user.id },
  })

  if (!provider) {
    return <div className="p-6">Provider profile not found.</div>
  }

  const [totalLearners, activeLearners, ms2Count, ms3Count, greenCount, amberCount, redCount, notifications] = await Promise.all([
    prisma.learnerProfile.count({ where: { providerId: provider.id } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ragStatus: { not: "RED" } } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ms2Achieved: true } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ms3Achieved: true } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ragStatus: "GREEN" } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ragStatus: "AMBER" } }),
    prisma.learnerProfile.count({ where: { providerId: provider.id, ragStatus: "RED" } }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  return (
    <>
      <TopBar title="Provider Overview" notificationCount={notifications} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Learners" value={totalLearners} icon={<Users className="h-6 w-6" />} />
          <StatCard title="Active Learners" value={activeLearners} icon={<UserCheck className="h-6 w-6" />} />
          <StatCard title="MS2 Achieved" value={ms2Count} icon={<Award className="h-6 w-6" />} />
          <StatCard title="MS3 Achieved" value={ms3Count} icon={<Award className="h-6 w-6" />} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Green" value={greenCount} icon={<Users className="h-6 w-6" />} color="bg-green-100 text-green-600" />
          <StatCard title="Amber" value={amberCount} icon={<AlertTriangle className="h-6 w-6" />} color="bg-amber-100 text-amber-600" />
          <StatCard title="Red" value={redCount} icon={<AlertTriangle className="h-6 w-6" />} color="bg-red-100 text-red-600" />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Create `app/(dashboard)/employer/page.tsx`**

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { Briefcase, FileText, UserCheck, Calendar } from "lucide-react"

export default async function EmployerDashboard() {
  const session = await getServerSession(authOptions)

  const employer = await prisma.employerProfile.findUnique({
    where: { userId: session!.user.id },
  })

  if (!employer) {
    return <div className="p-6">Employer profile not found.</div>
  }

  const [activeJobs, totalApplications, interviewCount, shortlistedCount, notifications] = await Promise.all([
    prisma.job.count({ where: { employerId: employer.id, status: "ACTIVE" } }),
    prisma.application.count({ where: { job: { employerId: employer.id } } }),
    prisma.interview.count({ where: { employerId: employer.id } }),
    prisma.application.count({ where: { job: { employerId: employer.id }, status: "SHORTLISTED" } }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  return (
    <>
      <TopBar title="Employer Overview" notificationCount={notifications} />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Active Jobs" value={activeJobs} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Applications" value={totalApplications} icon={<FileText className="h-6 w-6" />} />
          <StatCard title="Interviews" value={interviewCount} icon={<Calendar className="h-6 w-6" />} />
          <StatCard title="Shortlisted" value={shortlistedCount} icon={<UserCheck className="h-6 w-6" />} />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 5: Create `app/(dashboard)/learner/page.tsx`**

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { User, Briefcase, FileText, Award } from "lucide-react"

export default async function LearnerDashboard() {
  const session = await getServerSession(authOptions)

  const learner = await prisma.learnerProfile.findUnique({
    where: { userId: session!.user.id },
  })

  if (!learner) {
    return <div className="p-6">Learner profile not found.</div>
  }

  const [matchCount, applicationCount, notifications] = await Promise.all([
    prisma.jobMatch.count({ where: { learnerId: learner.id } }),
    prisma.application.count({ where: { learnerId: learner.id } }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  const milestonesAchieved = [learner.ms1Achieved, learner.ms2Achieved, learner.ms3Achieved].filter(Boolean).length

  return (
    <>
      <TopBar title="Learner Overview" notificationCount={notifications} />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Profile Complete" value={`${learner.profileComplete}%`} icon={<User className="h-6 w-6" />} />
          <StatCard title="Matched Jobs" value={matchCount} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Applications" value={applicationCount} icon={<FileText className="h-6 w-6" />} />
          <StatCard title="Milestones" value={`${milestonesAchieved}/3`} icon={<Award className="h-6 w-6" />} />
        </div>

        {/* Milestone tracker */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4">Milestone Progress</h2>
          <div className="flex items-center gap-4">
            {[
              { label: "MS1", achieved: learner.ms1Achieved, date: learner.ms1Date },
              { label: "MS2", achieved: learner.ms2Achieved, date: learner.ms2Date },
              { label: "MS3", achieved: learner.ms3Achieved, date: learner.ms3Date },
            ].map((ms, i) => (
              <div key={ms.label} className="flex items-center gap-2">
                {i > 0 && <div className={`h-0.5 w-8 ${ms.achieved ? "bg-primary" : "bg-gray-200"}`} />}
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    ms.achieved ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {ms.label}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
              learner.ragStatus === "GREEN" ? "bg-green-100 text-green-700" :
              learner.ragStatus === "AMBER" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>
              RAG: {learner.ragStatus}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 6: Create `app/(dashboard)/jobseeker/page.tsx`**

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopBar } from "@/components/dashboard/TopBar"
import { StatCard } from "@/components/dashboard/StatCard"
import { User, Briefcase, FileText } from "lucide-react"

export default async function JobSeekerDashboard() {
  const session = await getServerSession(authOptions)

  const jobSeeker = await prisma.jobSeekerProfile.findUnique({
    where: { userId: session!.user.id },
  })

  if (!jobSeeker) {
    return <div className="p-6">Job seeker profile not found.</div>
  }

  const [matchCount, applicationCount, notifications] = await Promise.all([
    prisma.jobMatch.count({ where: { jobSeekerId: jobSeeker.id } }),
    prisma.application.count({ where: { jobSeekerId: jobSeeker.id } }),
    prisma.notification.count({ where: { userId: session!.user.id, isRead: false } }),
  ])

  return (
    <>
      <TopBar title="Job Seeker Overview" notificationCount={notifications} />
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Profile Complete" value={`${jobSeeker.profileComplete}%`} icon={<User className="h-6 w-6" />} />
          <StatCard title="Matched Jobs" value={matchCount} icon={<Briefcase className="h-6 w-6" />} />
          <StatCard title="Applications" value={applicationCount} icon={<FileText className="h-6 w-6" />} />
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 7: Verify all 6 dashboards render**

```bash
npm run dev
```

Login with each seed user and verify:
1. `admin@edvancefe.com` → `/admin` → shows 5 stat cards
2. `staff@edvancefe.com` → `/staff` → shows 3 stat cards
3. `provider@codeinstitute.com` → `/provider` → shows learner counts + RAG cards
4. `employer@techcorp.com` → `/employer` → shows job/application stats
5. `learner@edvancefe.com` → `/learner` → shows profile %, matches, milestones
6. `seeker@edvancefe.com` → `/jobseeker` → shows profile %, matches, applications

- [ ] **Step 8: Commit**

```bash
git add app/(dashboard)/
git commit -m "feat: add overview dashboard pages for all 6 roles with real DB stats"
```

---

## Task 11: NextAuth Session Provider Wrapper

**Files:**
- Create: `components/providers/SessionProvider.tsx`
- Modify: `app/layout.tsx`

The login page and sidebar use `signIn`/`signOut` from `next-auth/react`, which requires a SessionProvider wrapper.

- [ ] **Step 1: Create `components/providers/SessionProvider.tsx`**

```typescript
"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
```

- [ ] **Step 2: Update `app/layout.tsx`**

```typescript
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SessionProvider } from "@/components/providers/SessionProvider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EdvanceFE — Smarter Progression Management",
  description: "Outcome Management System and job matching platform for UK funded skills provision",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/providers/ app/layout.tsx
git commit -m "feat: add NextAuth SessionProvider wrapper for client-side auth"
```

---

## Task 12: End-to-End Verification

**Files:** None — verification only.

- [ ] **Step 1: Fresh database reset and seed**

```bash
npx prisma migrate reset --force
```

Expected: Database reset, migration replayed, seed runs. All credentials printed.

- [ ] **Step 2: Start dev server and test login flow**

```bash
npm run dev
```

Test each user login:
- `admin@edvancefe.com` / `Admin@1234` → `/admin` with sidebar showing 11 nav items
- `staff@edvancefe.com` / `Staff@1234` → `/staff` with 6 nav items
- `provider@codeinstitute.com` / `Provider@1234` → `/provider` with learner stats
- `employer@techcorp.com` / `Employer@1234` → `/employer` with job stats
- `learner@edvancefe.com` / `Learner@1234` → `/learner` with milestone tracker
- `seeker@edvancefe.com` / `Seeker@1234` → `/jobseeker` with profile completion

- [ ] **Step 3: Test role protection**

While logged in as learner, navigate to `/admin`. Expected: redirects to `/learner`.
While logged in as employer, navigate to `/provider`. Expected: redirects to `/employer`.

- [ ] **Step 4: Test signup**

Sign out, navigate to `/signup`. Create a new Job Seeker account. Expected: role card selection → form → auto-login → redirect to `/jobseeker`.

- [ ] **Step 5: Test mobile responsiveness**

Resize browser to < 768px. Expected: sidebar hidden, hamburger menu visible, clicking hamburger opens sidebar overlay.

- [ ] **Step 6: Visual check**

Confirm:
- Brand color `#5B4FE8` on logo, active nav, buttons
- All icons are Lucide React (no emojis)
- Light background `#F8F9FA`, white cards, dark text `#1A1A2E`
- Clean professional appearance

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: Phase 1 complete — foundation, auth, and 6 role dashboards"
```
