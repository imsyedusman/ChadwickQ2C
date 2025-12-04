const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyTierCatalogItems() {
    console.log('=== VERIFYING TIER CATALOG ITEMS ===\n');

    const requiredItems = [
        '1A-TIERS',
        '1B-TIERS-400',
        'MISC-LABELS',
        'MISC-HARDWARE',
        'MISC-DELIVERY-UTE',
        'MISC-DELIVERY-HIAB'
    ];

    for (const partNumber of requiredItems) {
        const item = await prisma.catalogItem.findFirst({
            where: { partNumber }
        });

        if (item) {
            console.log(`✓ ${partNumber}: Found (${item.description})`);
        } else {
            console.log(`✗ ${partNumber}: NOT FOUND IN CATALOG`);
        }
    }

    console.log('\n=== VERIFICATION COMPLETE ===');
    await prisma.$disconnect();
}

verifyTierCatalogItems().catch(console.error);
