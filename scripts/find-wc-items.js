
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findItems() {
    console.log('Searching for Whole-Current Metering items...');

    const keywords = [
        '100A wiring',
        '100A Meter Protection',
        '100A Panel',
        '100A Neutral Link',
        '100A-MCB',
        '80A MCB'
    ];

    const items = await prisma.catalogItem.findMany({
        where: {
            OR: keywords.map(k => ({
                description: { contains: k, mode: 'insensitive' }
            }))
        }
    });

    console.log(`Found ${items.length} items:`);
    items.forEach((i) => {
        console.log(`- [${i.partNumber}] ${i.description} (Cat: ${i.category}, Sub: ${i.subcategory})`);
    });
}

findItems()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
