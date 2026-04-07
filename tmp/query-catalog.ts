
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.catalogItem.findMany({
    where: {
      OR: [
        { description: { contains: 'support', mode: 'insensitive' } },
        { partNumber: { startsWith: 'BB' } },
        { partNumber: { startsWith: 'BBC' } },
      ],
    },
    take: 20,
  });
  console.log(JSON.stringify(items, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
