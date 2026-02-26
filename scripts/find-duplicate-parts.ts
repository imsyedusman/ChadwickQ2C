import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Resolving duplicate part numbers in CatalogItem...');

    const items = await prisma.catalogItem.findMany({
        where: { partNumber: { not: null } },
        orderBy: { createdAt: 'asc' } // Keep oldest
    });

    const seenParts = new Set<string>();
    const idsToDelete: string[] = [];

    for (const item of items) {
        if (!item.partNumber) continue;

        if (seenParts.has(item.partNumber)) {
            idsToDelete.push(item.id);
        } else {
            seenParts.add(item.partNumber);
        }
    }

    if (idsToDelete.length > 0) {
        console.log(`Found ${idsToDelete.length} duplicates. Deleting...`);
        const result = await prisma.catalogItem.deleteMany({
            where: { id: { in: idsToDelete } }
        });
        console.log(`Deleted ${result.count} duplicate catalog items.`);
    } else {
        console.log('No duplicates found. Safe to apply unique constraint.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
