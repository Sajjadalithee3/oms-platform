-- AlterTable: User — add auth tracking columns
ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: ProviderProfile — add quota override
ALTER TABLE "ProviderProfile" ADD COLUMN "learnerQuotaOverride" INTEGER;

-- AlterTable: JobBoard — add scraper filter columns
ALTER TABLE "JobBoard" ADD COLUMN "scheduleTime" TEXT NOT NULL DEFAULT '06:00';
ALTER TABLE "JobBoard" ADD COLUMN "filterLocation" TEXT;
ALTER TABLE "JobBoard" ADD COLUMN "filterCategory" TEXT;
ALTER TABLE "JobBoard" ADD COLUMN "maxJobs" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "JobBoard" ADD COLUMN "filterDummy" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: Advertisement
CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "imageUrl" TEXT,
    "text" TEXT,
    "externalLink" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByRole" TEXT NOT NULL,
    "providerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Advertisement_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
