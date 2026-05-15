
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.catalogItem.count({
        where: { labourHours: { gt: 0 } }
    });
    console.log('Items with labour > 0:', count);
}

main().finally(() => prisma.$disconnect());
