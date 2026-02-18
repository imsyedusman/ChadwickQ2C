const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('--- ADVANCED DIAGNOSTIC SCRIPT (JS) ---');

    // 1. Fetch distinct subcategories for 'Busbar'
    console.log('\n[1] Subcategories for category="Busbar":');
    const subcats = await prisma.catalogItem.findMany({
        where: { category: 'Busbar', subcategory: { not: null } },
        select: { subcategory: true },
        distinct: ['subcategory'],
        orderBy: { subcategory: 'asc' }
    });

    if (subcats.length === 0) {
        console.log('NO SUBCATEGORIES FOUND!');
    }

    subcats.forEach((s, i) => {
        const str = s.subcategory;
        console.log(`[${i}] "${str}"`);
        // Print Char Codes
        const codes = [];
        for (let j = 0; j < str.length; j++) {
            codes.push(str.charCodeAt(j));
        }
        console.log(`    Codes: ${codes.join(' ')}`);
    });

    // 2. Fetch specific items
    console.log('\n[2] Fetching Cleat Items:');
    const items = await prisma.catalogItem.findMany({
        where: { partNumber: { startsWith: '1B1-CLEAT' } }
    });
    items.forEach(item => {
        console.log(`PN: ${item.partNumber} | Cat: ${item.category} | Brand: ${item.brand}`);
    });

}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
