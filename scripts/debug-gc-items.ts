import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const gcSkus = ['PBELKIT4', 'A9C20134', 'CCT15854', 'CCT15443', 'CCT15940', 'CCT15369',
        'XB4BD33', 'CHD-GC-RELAY-4P', 'RM17TG00', 'XB5AVM4',
        'CHD-FUSE-20A-DIN', 'CHD-WIRING-CONTROL'];

    console.log('\n--- CATALOG ITEMS ---');
    const catalogItems = await (prisma as any).catalogItem.findMany({
        where: { partNumber: { in: gcSkus } },
        select: { partNumber: true, category: true, subcategory: true }
    });
    for (const i of catalogItems) {
        console.log(`SKU: ${i.partNumber} | category: "${i.category}" | subcategory: "${i.subcategory}"`);
    }

    console.log('\n--- BOARD ITEMS matching GC SKUs ---');
    const boardItems = await (prisma as any).item.findMany({
        where: { partNumber: { in: gcSkus } },
        select: { partNumber: true, category: true, subcategory: true, quantity: true, isSystemManaged: true },
        take: 20
    });
    for (const i of boardItems) {
        console.log(`SKU: ${i.partNumber} | category: "${i.category}" | subcategory: "${i.subcategory}" | qty: ${i.quantity} | sys: ${i.isSystemManaged}`);
    }

    console.log('\n--- DISTINCT subcategories containing "control" or "general" ---');
    const rows = await (prisma as any).item.findMany({
        where: {
            OR: [
                { subcategory: { contains: 'General', mode: 'insensitive' } },
                { subcategory: { contains: 'Control', mode: 'insensitive' } }
            ]
        },
        select: { category: true, subcategory: true },
        distinct: ['category', 'subcategory'],
        take: 20
    });
    for (const r of rows) {
        console.log(`  category: "${r.category}" | subcategory: "${r.subcategory}"`);
    }

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
