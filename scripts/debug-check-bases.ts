import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking MCCB Base Items ---');

    const bases = await prisma.item.findMany({
        where: { systemTag: 'MCCB_TRIP_BASE' } as any,
        include: { board: true },
        orderBy: { createdAt: 'desc' },
        take: 10
    });

    console.log(`Found ${bases.length} Base Items (Tag: MCCB_TRIP_BASE)`);
    bases.forEach(b => {
        console.log(`- Base: ${b.name} (${b.partNumber}) | Qty: ${b.quantity}`);
        console.log(`  Board: ${b.board.name} | Variant: ${b.mccbVariant}`);
        console.log(`  Category: ${b.category} | Sub: ${b.subcategory}`);
        console.log('---');
    });

    // Also check for Trip Units to see if we have orphans
    const trips = await prisma.item.findMany({
        where: { mccbRole: 'TRIP_UNIT' } as any, // Assuming this role is set, otherwise check catalog role? 
        // We might not have mccbRole on strict item yet if we didn't copy it. 
        // API didn't strictly copy mccbRole in previous steps? Let's check.
        // We relied on mccbVariant presence.
        take: 10,
        orderBy: { createdAt: 'desc' }
    });

    // Actually we didn't copy mccbRole to Item in the schema, we added it to CatalogItem.
    // We added mccbVariant to Item.
    // So let's check items with mccbVariant that ARE NOT system managed (Trip Units)
    const possibleTrips = await prisma.item.findMany({
        where: {
            mccbVariant: { not: null },
            isSystemManaged: false
        } as any,
        take: 10,
        orderBy: { createdAt: 'desc' }
    });

    console.log(`\nFound ${possibleTrips.length} Potential Trip Units (Manual Items with Variant)`);
    possibleTrips.forEach(t => {
        console.log(`- Trip: ${t.name} (${t.partNumber}) | Variant: ${t.mccbVariant}`);
        console.log(`  BoardId: ${t.boardId}`);
    });
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
