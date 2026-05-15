
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const item = await prisma.catalogItem.findFirst({
        where: { partNumber: '1A-TIERS' }
    });
    console.log(JSON.stringify(item, null, 2));
}

main().finally(() => prisma.$disconnect());
