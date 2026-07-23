import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
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

  const sectorNames = ["Health Care", "Digital Support", "Information Technology", "Technical", "AI", "Non Technical"]
  await prisma.sector.createMany({
    data: sectorNames.map((name) => ({ name })),
  })

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

  const learner1 = await prisma.learnerProfile.create({
    data: {
      userId: learnerUser.id,
      providerId: provider.id,
      cohortId: cohort.id,
      headline: "Aspiring Healthcare Professional",
      phone: "07700 900001",
      location: "London",
      skills: JSON.stringify(["patient care", "communication", "teamwork"]),
      desiredSectors: JSON.stringify(["Health Care"]),
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
      desiredSectors: JSON.stringify(["Health Care"]),
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
      desiredSectors: JSON.stringify(["Health Care"]),
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

  const jobSeeker = await prisma.jobSeekerProfile.create({
    data: {
      userId: seekerUser.id,
      headline: "Full Stack Developer",
      bio: "Experienced developer looking for new opportunities",
      phone: "07700 900004",
      location: "Manchester",
      skills: JSON.stringify(["javascript", "typescript", "react", "node", "sql", "git"]),
      desiredSectors: JSON.stringify(["Information Technology"]),
      desiredSalaryMin: 35000,
      desiredSalaryMax: 55000,
      desiredLocation: "Manchester",
      remotePreference: "HYBRID",
      profileComplete: 75,
    },
  })

  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        employerId: employer.id,
        title: "Healthcare Assistant",
        company: "NHS Trust Manchester",
        location: "Manchester",
        sector: "Health Care",
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
        sector: "Health Care",
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
        sector: "Health Care",
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
        sector: "Information Technology",
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
        sector: "Information Technology",
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
        sector: "Digital Support",
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
        sector: "Technical",
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
        sector: "Non Technical",
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
        sector: "Technical",
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
        sector: "Non Technical",
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

  await prisma.jobMatch.create({
    data: { jobId: jobs[0].id, learnerId: learner1.id, matchScore: 72, matchedSkills: JSON.stringify(["patient care", "communication", "teamwork"]), missingSkills: JSON.stringify(["healthcare"]) },
  })
  await prisma.jobMatch.create({
    data: { jobId: jobs[1].id, learnerId: learner1.id, matchScore: 58, matchedSkills: JSON.stringify(["patient care", "communication"]), missingSkills: JSON.stringify(["care plan"]) },
  })
  await prisma.jobMatch.create({
    data: { jobId: jobs[0].id, learnerId: learner3.id, matchScore: 85, matchedSkills: JSON.stringify(["patient care", "clinical", "healthcare"]), missingSkills: JSON.stringify([]) },
  })
  await prisma.jobMatch.create({
    data: { jobId: jobs[2].id, learnerId: learner3.id, matchScore: 90, matchedSkills: JSON.stringify(["clinical", "healthcare", "care plan"]), missingSkills: JSON.stringify(["nhs"]) },
  })
  await prisma.jobMatch.create({
    data: { jobId: jobs[3].id, jobSeekerId: jobSeeker.id, matchScore: 88, matchedSkills: JSON.stringify(["javascript", "typescript", "react", "node", "sql"]), missingSkills: JSON.stringify([]) },
  })
  await prisma.jobMatch.create({
    data: { jobId: jobs[4].id, jobSeekerId: jobSeeker.id, matchScore: 45, matchedSkills: JSON.stringify(["sql"]), missingSkills: JSON.stringify(["python", "excel", "data"]) },
  })

  const app1 = await prisma.application.create({
    data: { jobId: jobs[0].id, learnerId: learner1.id, status: "SHORTLISTED", coverNote: "I am passionate about healthcare and have been training in this field.", matchScore: 72 },
  })
  const app2 = await prisma.application.create({
    data: { jobId: jobs[3].id, jobSeekerId: jobSeeker.id, status: "APPLIED", coverNote: "Experienced developer with strong React and Node.js skills.", matchScore: 88 },
  })

  await prisma.message.create({
    data: { applicationId: app1.id, senderId: employerUser.id, content: "Thank you for your application. We would like to invite you for an interview.", isRead: true },
  })
  await prisma.message.create({
    data: { applicationId: app1.id, senderId: learnerUser.id, content: "Thank you! I am available any time next week.", isRead: false },
  })
  await prisma.message.create({
    data: { applicationId: app2.id, senderId: seekerUser.id, content: "Hi, I wanted to follow up on my application. Looking forward to hearing from you.", isRead: false },
  })

  await prisma.interview.create({
    data: {
      applicationId: app1.id,
      employerId: employer.id,
      proposedSlots: JSON.stringify(["2026-07-10T10:00:00Z", "2026-07-11T14:00:00Z", "2026-07-12T09:00:00Z"]),
      status: "PENDING",
      location: "NHS Trust Manchester, Building A",
    },
  })

  await prisma.jobBoard.create({
    data: { name: "Reed", boardType: "REED", apiKey: "", schedule: "DAILY", isActive: false, lastJobCount: 0 },
  })

  await prisma.systemSetting.create({
    data: { key: "min_match_threshold", value: "40" },
  })

  await prisma.notification.create({
    data: { userId: learnerUser.id, title: "Application Shortlisted", body: "Your application for Healthcare Assistant has been shortlisted.", type: "APPLICATION_UPDATE", link: "/learner/applications", isRead: false },
  })
  await prisma.notification.create({
    data: { userId: employerUser.id, title: "New Application Received", body: "Maria Garcia applied for Full Stack Developer.", type: "NEW_APPLICATION", link: "/employer/applications", isRead: false },
  })

  await prisma.auditLog.create({ data: { userId: adminUser.id, action: "CREATE", entity: "User", entityId: providerUser.id, detail: "Created training provider account for Code Institute" } })
  await prisma.auditLog.create({ data: { userId: providerUser.id, action: "CREATE", entity: "LearnerProfile", entityId: learner1.id, detail: "Enrolled learner Alex Thompson in Health & Social Care Level 3" } })
  await prisma.auditLog.create({ data: { userId: employerUser.id, action: "CREATE", entity: "Job", entityId: jobs[0].id, detail: "Posted Healthcare Assistant position" } })
  await prisma.auditLog.create({ data: { userId: employerUser.id, action: "UPDATE", entity: "Application", entityId: app1.id, detail: "Shortlisted application from Alex Thompson" } })

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
