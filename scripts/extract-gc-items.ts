
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

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
        const items = await prisma.catalogItem.findMany({
            where: {
                OR: [
                    { partNumber: { in: SKUS } },
                    { subcategory: { contains: 'General Control' } }
                ]
            }
        });

        fs.writeFileSync('gc-items-all.json', JSON.stringify(items, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2));
        
        console.log(`Saved ${items.length} items to gc-items-all.json`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

findItems();
