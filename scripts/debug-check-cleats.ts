import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying Busbar Supports in DB...');

    const partNumbers = [
        '1B1-CLEAT-SMALL-1',
        '1B1-CLEAT-SMALL-2',
        '1B1-CLEAT-LARGE-2',
        '1B1-CLEAT-LARGE-3'
    ];

    const items = await prisma.catalogItem.findMany({
        where: {
            partNumber: { in: partNumbers }
        }
    });

    console.log(`Found ${items.length} items.`);

    items.forEach(item => {
        console.log(`- Part: ${item.partNumber}`);
        console.log(`  Category: '${item.category}'`);
        console.log(`  Subcategory: '${item.subcategory}'`);
        console.log(`  ID: ${item.id}`);
    });

    // Check for potential duplicates (although we assume partNumber should be unique conceptually)
    const allBusbarItems = await prisma.catalogItem.findMany({
        where: { category: 'Busbar' },
        select: { category: true }
    });
    console.log(`\nTotal items with category 'Busbar': ${allBusbarItems.length}`);

    const allBusbarsItems = await prisma.catalogItem.findMany({
        where: { category: 'Busbars' },
        select: { category: true }
    });
    console.log(`Total items with category 'Busbars' (plural): ${allBusbarsItems.length}`);

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
