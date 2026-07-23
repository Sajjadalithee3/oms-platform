# Desired Sector, Salary Bands & Sector-Fallback Matching — Design

**Goal:** Replace free-text "Desired Role" with an admin-managed, multi-select "Desired Sector" field (max 5 per candidate), replace free-number salary with capped preset bands, add an Employment Type preference, and rework the matching engine so a sector match carries real weight when skills don't overlap.

**Architecture:** A new `Sector` lookup table backs an admin-managed taxonomy (seeded with 6 sectors, extensible without a code change). Learner and Job Seeker profiles both move from free-text roles to sector multi-select. The matching engine's weighted-sum scoring is rebalanced so sector match is a meaningful independent contributor, not just a minor factor.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, existing shadcn/ui components, existing `lib/matching.ts` scoring engine.

---

## 1. Data model

### New: `Sector` table

```prisma
model Sector {
  id        String   @id @default(cuid())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

Deactivate rather than delete, so a candidate's historical selection referencing a retired sector doesn't dangle or break existing JSON arrays.

**Seed data** (migration or seed script): `Health Care`, `Digital Support`, `Information Technology`, `Technical`, `AI`, `Non Technical` — all `isActive: true`.

### `LearnerProfile` / `JobSeekerProfile` changes

- Rename `desiredRoles` → `desiredSectors` (same `String @default("[]")` JSON-array-of-strings shape, now storing sector `name` values instead of free-text role titles). A straight column rename — no new column, no data-shape change, so the rename is a single `ALTER TABLE ... RENAME COLUMN` migration.
- Add `employmentType String?` (`"FULL_TIME" | "PART_TIME" | "BOTH"`), stored only — not yet scored in matching, consistent with the existing unscored `remotePreference` field.
- `desiredSalaryMin` / `desiredSalaryMax` (`Int?`) are **reused as-is**. The UI constrains input to 3 preset bands rather than freeform numbers; no schema change:
  - Under £25,000 → `min: null, max: 25000`
  - £25,000–£35,000 → `min: 25000, max: 35000`
  - £35,000–£50,000 → `min: 35000, max: 50000`

### Migration data-loss note

Existing `desiredRoles` values (free-text like "Care Worker", "Healthcare Assistant") have no reliable mapping to the new sector taxonomy and will be **cleared** on migration. Learners/job seekers re-select their sector(s) next time they open their profile. This will be called out in the migration commit message and to the user before running it in production.

---

## 2. Admin sector management

New page `/admin/sectors` (Super Admin only):

- List all sectors with an Active/Inactive toggle badge.
- "Add Sector" form: name input + submit. Rejects duplicates (case-insensitive) with an inline error.
- Toggle button per row to activate/deactivate (soft delete — no hard delete, to protect historical references).

New API routes:

- `GET /api/admin/sectors` — list all (including inactive, for the admin management view).
- `GET /api/sectors` — list active only (for profile-page dropdowns; any authenticated role can read this).
- `POST /api/admin/sectors` — create (Super Admin only).
- `PATCH /api/admin/sectors/[id]` — toggle `isActive` (Super Admin only).

---

## 3. Profile UI changes (Learner + Job Seeker "Preferences" tab)

Both `app/(dashboard)/learner/profile/page.tsx` and `app/(dashboard)/jobseeker/profile/page.tsx` get the same treatment in their Preferences tab:

- **Remove**: the "Add desired role..." free-text input and its tag list.
- **Add**: a sector multi-select populated from `GET /api/sectors`. Rendered as a checkbox/chip list (consistent with the existing skill-tag chip style already used elsewhere on the page) capped at 5 selections — attempting a 6th shows an inline "Maximum 5 sectors" message rather than a hard block, so the cap is understandable rather than silently unresponsive.
- **Replace**: Min/Max salary number inputs with a single `<Select>` offering the 3 bands plus a blank "Not specified" option. Selecting a band sets both `desiredSalaryMin` and `desiredSalaryMax` from the mapping above.
- **Add**: Employment Type `<Select>` — Full-time / Part-time / Both / blank "Not specified".

The rest of the Preferences tab (Preferred Location, Remote) is unchanged.

---

## 4. Matching engine (`lib/matching.ts`)

### Weight rebalancing

| Component | Old weight | New weight |
|---|---|---|
| Skills | 50 | 45 |
| Sector | 20 | 30 |
| Location | 15 | 15 |
| Seniority | 10 | 10 |
| Title (desired role vs job title) | 5 | **removed** |

Total stays at 100. The 5 points freed by removing the title component (which depended on the now-deleted `desiredRoles`) plus 5 points taken from skills both move to sector.

### Sector scoring change

`calculateSectorScore` currently does an exact-string match between `candidate.courseSector` (a single value) and `job.sector`. It's replaced with: full sector weight (30pts) if `job.sector` (case-insensitive) is present anywhere in `candidate.desiredSectors` (the up-to-5 array), else 0.

`courseSector` is untouched and keeps its existing separate meaning (the sector of the learner's funded training course, shown read-only at the top of their profile) — it is *not* used in matching after this change. Only the candidate's own selected `desiredSectors` drives the sector-match score.

### Why this satisfies "if skills don't match, sector should still match"

Each component is computed independently and summed. A candidate with **zero** skill overlap but a sector match now lands at a 30/100 floor (previously a max 20/100 floor before the reweighting) — enough to surface as a real match rather than being buried near the bottom by an almost-all-zero score. Skills, location, and seniority still stack on top when they do line up, so a strong all-round match still outscores a sector-only one.

### Job Seeker parity

`runMatchingForCandidate` and `runMatchingForJob` currently build the `CandidateProfile` object per-role (learner vs job seeker) before calling `calculateMatchScore`. Both branches switch from reading `desiredRoles` to `desiredSectors`, and the job-seeker branch (which never had `courseSector`) is unaffected by the `courseSector` decoupling above since it never used it for its own sector score in the first place — job seekers were previously only sector-scored via `courseSector` on the *learner* branch; going forward both candidate types get the same `desiredSectors`-driven sector scoring.

---

## 5. Out of scope for this change

- Employment Type is **not** factored into the match score — stored/displayed only, matching the precedent set by the existing `remotePreference` field.
- No re-scoring/backfill job for existing `JobMatch` rows is run automatically as part of this change; matches recalculate the next time a candidate's profile is saved or the admin/staff matching run is triggered, same as today's existing behavior.
- Sector management import/export (bulk CSV of sectors) is not included — the admin UI is add/toggle only.
