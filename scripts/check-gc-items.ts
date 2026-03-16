
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SKUS = [
    'PBELKIT4',
    'A9C20134',
    'CCT15854',
    'CCT15443',
    'CCT15940',
    'CCT15369',
    'XB4BD33',
    'CHD-GC-RELAY-4P',
    'RM17TG00',
    'XB5AVM4',
    'CHD-FUSE-20A-DIN',
    'CHD-WIRING-CONTROL'
];

async function findItems() {
    try {
        console.log('Searching for General Control items in CatalogItem...');

        const items = await prisma.catalogItem.findMany({
            where: {
                partNumber: { in: SKUS }
            }
        });

        console.log(`Found ${items.length} of ${SKUS.length} items:`);
        items.forEach(i => {
            console.log(`- PartNumber: '${i.partNumber}'`);
            console.log(`  Description: ${i.description}`);
            console.log(`  Category: ${i.category}, Subcategory: ${i.subcategory}`);
            console.log(`  Price: ${i.unitPrice}, Labour: ${i.labourHours}`);
            console.log('-------------------');
        });

        const missing = SKUS.filter(sku => !items.find(i => i.partNumber === sku));
        if (missing.length > 0) {
            console.log('Missing items:');
            missing.forEach(sku => console.log(`- ${sku}`));
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

findItems();
