import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.catalogItem.findMany({
    take: 100,
    select: {
      description: true,
      category: true,
      subcategory: true,
    }
  });

  console.log(JSON.stringify(items, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
