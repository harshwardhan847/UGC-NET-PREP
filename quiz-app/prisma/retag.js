// Applies the corrected unit and topic from src/data/study_map.json to the existing database.
// Only the Question rows change: attempts, quiz sessions and bookmarks are left alone, unlike seed.js.
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();
const { tags, units } = require(path.join(__dirname, '../src/data/study_map.json'));
const UNIT_NAMES = Object.fromEntries(units.map(u => [u.unit, u.name]));

async function main() {
  const ids = Object.keys(tags);
  const existing = await prisma.question.count();
  const before = await prisma.attempt.count();
  console.log(`Retagging ${ids.length} questions (${existing} in database, ${before} attempts).`);

  const batchSize = 200;
  for (let i = 0; i < ids.length; i += batchSize) {
    await prisma.$transaction(
      ids.slice(i, i + batchSize).map(id =>
        prisma.question.updateMany({
          where: { id },
          data: { unit: tags[id].unit, unitName: UNIT_NAMES[tags[id].unit], conceptName: tags[id].topic }
        })
      )
    );
  }

  const after = await prisma.attempt.count();
  console.log(`Done. Attempts before: ${before}, after: ${after}.`);
  if (before !== after) throw new Error('Attempt count changed');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
