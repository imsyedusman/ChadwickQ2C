const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNOSTIC SCRIPT ---');

    // 1. Verify DB Items
    console.log('\n[1] Verifying Item Records:');
    const partNumbers = [
        '1B1-CLEAT-SMALL-1',
        '1B1-CLEAT-SMALL-2',
        '1B1-CLEAT-LARGE-2',
        '1B1-CLEAT-LARGE-3'
    ];
    const items = await prisma.catalogItem.findMany({
        where: { partNumber: { in: partNumbers } }
    });

    items.forEach((i: any) => {
        console.log(`Part: ${i.partNumber.padEnd(20)} | Cat: [${i.category}] | Sub: [${i.subcategory}]`);
    });

    // 2. Simulate API Tree Query (Category = 'Busbar')
    console.log('\n[2] Simulating API Tree Query (category=Busbar):');
    const treeWhere = {
        subcategory: { not: null },
        category: 'Busbar'
    };

    const subcats = await prisma.catalogItem.findMany({
        where: treeWhere,
        select: { subcategory: true },
        distinct: ['subcategory'],
        orderBy: { subcategory: 'asc' }
    });

    const subcatList = subcats.map((s: any) => s.subcategory).filter(Boolean);
    console.log(`Found ${subcatList.length} subcategories.`);
    const cleatSubcat = 'Busbar Supports - Required for Custom Boards Only';
    const found = subcatList.includes(cleatSubcat);
    console.log(`Detailed Check: Is '${cleatSubcat}' in list? ${found ? 'YES' : 'NO'}`);

    if (!found) {
        console.log('List:', subcatList);
    }

    // 3. Simulate API Item Query (Category = 'Busbar', Subcategory = ...)
    console.log(`\n[3] Simulating API Item Query (category=Busbar, subcategory='${cleatSubcat}'):`);
    const whereClause = {
        AND: [
            { category: 'Busbar' },
            { subcategory: { startsWith: cleatSubcat } }
        ]
    };

    const fetchedItems = await prisma.catalogItem.findMany({
        where: whereClause
    });
    console.log(`Fetched ${fetchedItems.length} items.`);

}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());

export {};
