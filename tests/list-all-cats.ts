import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.catalogItem.findMany({
        select: { category: true, subcategory: true },
        distinct: ['category', 'subcategory']
    });
    console.log(JSON.stringify(items, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
