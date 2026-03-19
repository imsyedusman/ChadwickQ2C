import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Catalog Category Recovery ---');

    // 1. Fix "null" string brands back to actual nulls
    const fixBrands = await prisma.catalogItem.updateMany({
        where: { brand: 'null' },
        data: { brand: null }
    });
    console.log(`Updated ${fixBrands.count} items with string brand "null" to actual null.`);

    // 2. Re-categorize Basics
    const basicPrefixes = ['1A-', '1B-', 'CT-', '100A-', 'MISC-'];
    let basicCount = 0;
    for (const prefix of basicPrefixes) {
        const result = await prisma.catalogItem.updateMany({
            where: {
                partNumber: { startsWith: prefix, mode: 'insensitive' },
                category: 'Switchboard' // Only update if it was flattened
            },
            data: { category: 'Basics' }
        });
        console.log(`Prefix "${prefix}" -> Basics: ${result.count} items`);
        basicCount += result.count;
    }

    // 3. Re-categorize Busbar
    const busbarPrefixes = ['BB-', 'BBC-', 'MCCB-', 'ACB-', 'CHASSIS-', 'CU-'];
    let busbarCount = 0;
    for (const prefix of busbarPrefixes) {
        const result = await prisma.catalogItem.updateMany({
            where: {
                partNumber: { startsWith: prefix, mode: 'insensitive' },
                category: 'Switchboard'
            },
            data: { category: 'Busbar' }
        });
        console.log(`Prefix "${prefix}" -> Busbar: ${result.count} items`);
        busbarCount += result.count;
    }

    console.log(`\nRecovery Complete.`);
    console.log(`Total Basics recovered: ${basicCount}`);
    console.log(`Total Busbar recovered: ${busbarCount}`);

    // Verification
    const finalStats = await prisma.catalogItem.groupBy({
        by: ['category'],
        _count: { id: true }
    });
    console.log('\nFinal Category Stats:');
    console.table(finalStats);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
