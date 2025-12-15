
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findCatalogItem() {
    try {
        console.log('Searching for "Reconnection" in CatalogItem...');

        // Search by description
        const items = await prisma.catalogItem.findMany({
            where: {
                description: { contains: 'Reconnection', mode: 'insensitive' }
            }
        });

        if (items.length > 0) {
            console.log('Found matches:');
            items.forEach(i => {
                console.log(`- PartNumber: '${i.partNumber}'`);
                console.log(`  Description: ${i.description}`);
                console.log(`  Category: ${i.category}, Subcategory: ${i.subcategory}`);
                console.log(`  Price: ${i.unitPrice}, Labour: ${i.labourHours}`);
            });
        } else {
            console.log('No matches found for "Reconnection" in description.');
        }

        // Also check exact part number again just in case
        const exact = await prisma.catalogItem.findFirst({
            where: { partNumber: 'MISC-SITE-RECONNECTION' }
        });
        console.log(`Exact match check ('MISC-SITE-RECONNECTION'): ${exact ? 'FOUND' : 'NOT FOUND'}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

findCatalogItem();
