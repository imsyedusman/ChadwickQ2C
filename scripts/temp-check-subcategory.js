const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Find all subcategories that contain 'Isolator'
    const subcats = await prisma.catalogItem.findMany({
        where: { subcategory: { contains: 'Isolator' } },
        select: { subcategory: true },
        distinct: ['subcategory']
    });
    console.log("Subcategories found:", subcats.map(s => s.subcategory));

    // 2. Fetch a working Isolator record
    const workingIsolator = await prisma.catalogItem.findFirst({
        where: { subcategory: 'Switches > Isolator > 3P' } // Assuming this is one of the working ones
    });
    console.log("\nWorking Isolator (Sample 3P):", JSON.stringify(workingIsolator, null, 2));

    // 3. Fetch one of our new records
    const newRecord = await prisma.catalogItem.findFirst({
        where: { partNumber: 'CHD-KEYBOX-3-1' }
    });
    console.log("\nNew Chadwick Record:", JSON.stringify(newRecord, null, 2));
}

main().finally(() => prisma.$disconnect());
