import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const item = await prisma.catalogItem.findFirst({
        where: { partNumber: 'BB-3000A' }
    });
    console.log(JSON.stringify(item, null, 2));
}

check().finally(() => prisma.$disconnect());
