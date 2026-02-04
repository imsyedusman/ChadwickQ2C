import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- MCCB Pairing Debug ---');

    // 1. Check last 10 created items
    console.log('\n[1] Last 10 Items Created:');
    const items = await prisma.item.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { board: { select: { name: true } } }
    });

    items.forEach(i => {
        console.log(`- [${i.createdAt.toISOString()}] ${i.name} (Qty: ${i.quantity})`);
        console.log(`  ID: ${i.id} | Board: ${i.board.name}`);
        console.log(`  Part: ${i.partNumber} | Variant: ${i.mccbVariant} | Tag: ${i.systemTag}`);
        console.log(`  SystemManaged: ${i.isSystemManaged} | Role: ${(i as any).mccbRole || 'N/A'}`);
        console.log('---');
    });

    // 2. Check Rules for a common Trip Unit
    const TEST_TRIP = 'C1035E100'; // Example
    console.log(`\n[2] Rules for Trip Part: ${TEST_TRIP}`);
    const rules = await prisma.mccbTripBaseRule.findMany({
        where: { tripPartNumber: TEST_TRIP }
    });
    rules.forEach(r => {
        console.log(`  Variant: ${r.variant} -> Base: ${r.basePartNumber}`);
    });

    // 3. Check Catalog Data for Trip Unit
    console.log(`\n[3] Catalog Data for Trip Part: ${TEST_TRIP}`);
    const catalogItems = await prisma.catalogItem.findMany({
        where: { partNumber: TEST_TRIP }
    });
    catalogItems.forEach(c => {
        console.log(`  ID: ${c.id} | Desc: ${c.description}`);
        console.log(`  Variant: ${c.mccbVariant} | Role: ${c.mccbRole}`);
        console.log(`  Category: ${c.category} | Sub: ${c.subcategory}`);
    });

    // 4. Check System Base Items
    console.log('\n[4] System Base Items on Boards (Tag: MCCB_TRIP_BASE)');
    const bases = await prisma.item.findMany({
        where: { systemTag: 'MCCB_TRIP_BASE' },
        take: 10,
        orderBy: { createdAt: 'desc' }
    });

    if (bases.length === 0) {
        console.log('  No system base items found with tag MCCB_TRIP_BASE.');
        // Fallback check for old style notes
        const oldStyle = await prisma.item.findMany({
            where: { isSystemManaged: true, notes: { contains: '[SYS:MCCB_TRIP_BASE]' } },
            take: 5
        });
        if (oldStyle.length > 0) {
            console.log(`  Found ${oldStyle.length} items with old note tag [SYS:MCCB_TRIP_BASE] but NO systemTag.`);
        }
    } else {
        bases.forEach(b => {
            console.log(`  Base: ${b.name} (${b.partNumber}) | Qty: ${b.quantity} | Board: ${b.boardId}`);
        });
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
