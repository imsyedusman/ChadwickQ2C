const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const items = await prisma.catalogItem.findMany({
        where: { partNumber: 'CHD-WIRING-DIGITAL' }
    });
    console.log(`Found ${items.length} items with partNumber CHD-WIRING-DIGITAL`);
    for (const item of items) {
        console.log(`- ${item.description} (ID: ${item.id}, subcategory: ${item.subcategory})`);
    }

    const itemsByDesc = await prisma.catalogItem.findMany({
        where: { description: { contains: 'Wiring - Digital' } }
    });
    console.log(`\nFound ${itemsByDesc.length} items with description containing 'Wiring - Digital'`);
    for (const item of itemsByDesc) {
        console.log(`- ${item.description}: PN=${item.partNumber}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
