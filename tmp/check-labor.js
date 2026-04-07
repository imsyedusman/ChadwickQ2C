const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showTierCatalogItems() {
    const requiredItems = [
        '1A-TIERS',
        '1B-TIERS-400',
        'MISC-LABELS',
        'MISC-HARDWARE',
    ];

    for (const partNumber of requiredItems) {
        const item = await prisma.catalogItem.findFirst({
            where: { partNumber }
        });

        if (item) {
            console.log(`${partNumber}: Price=${item.unitPrice}, Labor=${item.labourHours}`);
        } else {
            console.log(`${partNumber}: NOT FOUND`);
        }
    }
    await prisma.$disconnect();
}

showTierCatalogItems().catch(console.error);
