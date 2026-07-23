const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const bySector = await prisma.job.groupBy({
    by: ['sector'],
    where: { status: 'ACTIVE' },
    _count: { id: true },
  })
  console.log('Active jobs by sector:')
  for (const row of bySector) {
    console.log(`  ${row.sector}: ${row._count.id}`)
  }
  const total = await prisma.job.count({ where: { status: 'ACTIVE' } })
  console.log('Total active jobs:', total)
}

main().catch(e => console.error('ERROR:', e.message)).finally(() => prisma.$disconnect())
