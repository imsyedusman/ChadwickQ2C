
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkItems() {
    const itemNos = [
        'CT-COMPARTMENTS',
        'CT-PANEL',
        'CT-TEST-BLOCK',
        'CT-WIRING',
        'CT-S-TYPE',
        'CT-T-TYPE',
        'CT-W-TYPE',
        'CT-U-TYPE',
        '100A-PANEL'
    ];

    console.log('Checking for items in CatalogItem...');
    const items = await prisma.catalogItem.findMany({
        where: {
            partNumber: {
                in: itemNos
            }
        }
    });

    console.log('Found items count:', items.length);
    items.forEach((i: any) => {
        console.log(`- ${i.partNumber}: ${i.description} (Category: ${i.category})`);
    });

    const foundPartNumbers = items.map((i: any) => i.partNumber);
    const missing = itemNos.filter(no => !foundPartNumbers.includes(no));

    if (missing.length > 0) {
        console.log('Missing items:', missing);
    } else {
        console.log('All items found.');
    }
}

checkItems()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

export { };
