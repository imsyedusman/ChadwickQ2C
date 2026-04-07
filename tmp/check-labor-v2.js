const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showTierCatalogItems() {
    const items = await prisma.catalogItem.findMany({
        where: {
            partNumber: {
                in: ['1A-TIERS', '1B-TIERS-400', 'MISC-LABELS', 'MISC-HARDWARE']
            }
        }
    });

    for (const item of items) {
        console.log(`PART: ${item.partNumber} | PRICE: ${item.unitPrice} | LABOR: ${item.labourHours}`);
    }
    await prisma.$disconnect();
}

showTierCatalogItems().catch(console.error);
