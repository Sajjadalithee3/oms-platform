const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const SECTOR_MAP = {
  'Health & Social Care': 'Health Care',
  'Technology': 'Information Technology',
  'Marketing & Sales': 'Digital Support',
  'Construction': 'Technical',
  'Logistics': 'Technical',
  'Education': 'Non Technical',
  'Finance': 'Non Technical',
  'General': 'Non Technical',
}

async function main() {
  let totalUpdated = 0
  for (const [oldSector, newSector] of Object.entries(SECTOR_MAP)) {
    const result = await prisma.job.updateMany({
      where: { sector: oldSector },
      data: { sector: newSector },
    })
    if (result.count > 0) {
      console.log(`${oldSector} -> ${newSector}: ${result.count} job(s) updated`)
      totalUpdated += result.count
    }
  }
  console.log('Total updated:', totalUpdated)

  const bySector = await prisma.job.groupBy({
    by: ['sector'],
    where: { status: 'ACTIVE' },
    _count: { id: true },
  })
  console.log('\nActive jobs by sector after backfill:')
  for (const row of bySector) {
    console.log(`  ${row.sector}: ${row._count.id}`)
  }
}

main().catch(e => console.error('ERROR:', e.message)).finally(() => prisma.$disconnect())
