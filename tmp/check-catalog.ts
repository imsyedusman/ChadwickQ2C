import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
  const count = await prisma.catalogItem.count({
    where: {
      subcategory: 'Cubic Switchboard Enclosures (includes busbar supports)',
      isSheetmetal: true
    }
  });
  console.log(`Overlap count: ${count}`);
}
check().then(() => prisma.$disconnect());
