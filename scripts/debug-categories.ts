import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const items = await prisma.catalogItem.findMany({
        where: {
            category: 'Switchboard',
            subcategory: {
                startsWith: 'Miscellaneous'
            }
        },
        select: {
            subcategory: true
        },
        distinct: ['subcategory']
    });

    console.log(items);
}

main().catch(console.error).finally(() => prisma.$disconnect());
