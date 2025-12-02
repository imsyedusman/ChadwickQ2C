import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPowerMeters() {
    console.log('=== Checking Power Meter Categories ===\n');

    // Find all power meter items
    const powerMeters = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { subcategory: { contains: 'Power Meter' } },
                { subcategory: 'Power Meters' },
                { description: { contains: 'Power meter' } },
            ]
        },
        orderBy: [
            { brand: 'asc' },
            { subcategory: 'asc' }
        ]
    });

    console.log(`Found ${powerMeters.length} power meter items\n`);

    // Group by category and subcategory
    const grouped = powerMeters.reduce((acc, item) => {
        const key = `${item.category} > ${item.subcategory}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {} as Record<string, typeof powerMeters>);

    // Display grouped results
    for (const [path, items] of Object.entries(grouped)) {
        console.log(`\n${path}`);
        console.log(`  Count: ${items.length}`);
        console.log(`  Brands: ${[...new Set(items.map(i => i.brand || 'null'))].join(', ')}`);
        console.log(`  Sample items:`);
        items.slice(0, 3).forEach(item => {
            console.log(`    - ${item.partNumber || 'N/A'}: ${item.description.substring(0, 60)}`);
        });
    }

    // Check for duplicates
    console.log('\n\n=== Checking for Duplicates ===\n');
    const partNumbers = powerMeters.filter(pm => pm.partNumber).map(pm => pm.partNumber);
    const duplicates = partNumbers.filter((pn, idx) => partNumbers.indexOf(pn) !== idx);

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicate part numbers:`);
        for (const dup of [...new Set(duplicates)]) {
            const dupItems = powerMeters.filter(pm => pm.partNumber === dup);
            console.log(`\n  ${dup}:`);
            dupItems.forEach(item => {
                console.log(`    - ${item.category} > ${item.subcategory} (${item.brand || 'null'})`);
            });
        }
    } else {
        console.log('No duplicates found by part number');
    }

    await prisma.$disconnect();
}

checkPowerMeters().catch(console.error);
