const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPowerMeters() {
    console.log('=== Checking Power Meter Categories ===\n');

    // Find all power meter items
    const powerMeters = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { subcategory: { contains: 'Power Meter' } },
                { subcategory: 'Power Meters' },
            ]
        },
        select: {
            id: true,
            brand: true,
            category: true,
            subcategory: true,
            partNumber: true,
            description: true,
        },
        orderBy: [
            { brand: 'asc' },
            { subcategory: 'asc' }
        ]
    });

    console.log(`Found ${powerMeters.length} power meter items\n`);

    // Group by subcategory path
    const grouped = powerMeters.reduce((acc, item) => {
        const key = `${item.category} > ${item.subcategory}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(item);
        return acc;
    }, {});

    // Display grouped results
    for (const [path, items] of Object.entries(grouped)) {
        console.log(`\n${path}`);
        console.log(`  Count: ${items.length}`);
        const brands = [...new Set(items.map(i => i.brand || 'null'))];
        console.log(`  Brands: ${brands.join(', ')}`);
        console.log(`  Sample items:`);
        items.slice(0, 3).forEach(item => {
            console.log(`    - ${item.partNumber || 'N/A'}: ${item.description.substring(0, 60)}`);
        });
    }

    // Check for duplicates by part number
    console.log('\n\n=== Checking for Duplicates ===\n');
    const withPartNumbers = powerMeters.filter(pm => pm.partNumber);
    const partNumberCounts = {};

    withPartNumbers.forEach(item => {
        if (!partNumberCounts[item.partNumber]) {
            partNumberCounts[item.partNumber] = [];
        }
        partNumberCounts[item.partNumber].push(item);
    });

    const duplicates = Object.entries(partNumberCounts).filter(([pn, items]) => items.length > 1);

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicate part numbers:\n`);
        duplicates.forEach(([pn, items]) => {
            console.log(`  ${pn}:`);
            items.forEach(item => {
                console.log(`    - ${item.category} > ${item.subcategory} (${item.brand || 'null'})`);
            });
        });
    } else {
        console.log('No duplicates found by part number');
    }

    await prisma.$disconnect();
}

checkPowerMeters().catch(console.error);
