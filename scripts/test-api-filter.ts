import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Check what's actually in the DB for Busbars
    const allBusbars = await prisma.catalogItem.findMany({
        where: { category: 'Busbar' },
        select: { subcategory: true, description: true }
    });
    console.log('All Busbar subcategories:', [...new Set(allBusbars.map(i => i.subcategory))]);

    // 2. Simulate what the UI sends when clicking "Main Bars - labour and copper"
    const uiQuery = "Main Bars - labour and copper";

    // 3. Test exact match (current API logic)
    const exactMatch = await prisma.catalogItem.findMany({
        where: {
            category: 'Busbar',
            subcategory: uiQuery
        }
    });
    console.log(`Exact match for "${uiQuery}": ${exactMatch.length} items`);

    // 4. Test startsWith (proposed fix)
    const startsWith = await prisma.catalogItem.findMany({
        where: {
            category: 'Busbar',
            subcategory: { startsWith: uiQuery }
        }
    });
    console.log(`StartsWith match for "${uiQuery}": ${startsWith.length} items`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
