import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const parts = ['CHD-FUSE-20A-DIN', 'CHD-GC-RELAY-4P', 'CHD-WIRING-CONTROL'];
  const items = await prisma.catalogItem.findMany({
    where: { partNumber: { in: parts } },
  });

  for (const part of parts) {
    const item = items.find(i => i.partNumber?.toUpperCase() === part.toUpperCase());
    if (item) {
      console.log(`- ${part}: EXISTS`);
      console.log(`  partNumber: ${item.partNumber}`);
      console.log(`  description: ${item.description}`);
      console.log(`  subcategory: ${item.subcategory}`);
    } else {
      console.log(`- ${part}: DOES NOT EXIST`);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
