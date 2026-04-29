import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const mccbItems = await prisma.catalogItem.findMany({
        where: {
            subcategory: { startsWith: 'Circuit Breakers > MCCB' }
        }
    });

    console.log(`Found ${mccbItems.length} MCCB categorized items.`);
    mccbItems.slice(0, 10).forEach(item => {
        console.log(`- [${item.subcategory}] ${item.description} (${item.partNumber})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
