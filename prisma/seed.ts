import { PrismaClient } from '@prisma/client';
import { CATEGORIES, LOCATIONS, USERS } from '../src/modules/directory/seed-data';

const prisma = new PrismaClient();

async function main() {
  for (const c of CATEGORIES) await prisma.category.upsert({ where: { id: c.id }, create: c, update: c });
  for (const l of LOCATIONS) await prisma.location.upsert({ where: { id: l.id }, create: l, update: l });
  for (const u of USERS) await prisma.user.upsert({ where: { id: u.id }, create: u, update: u });
  console.log(`Seed OK : ${USERS.length} utilisateurs, ${LOCATIONS.length} lieux, ${CATEGORIES.length} catégories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
