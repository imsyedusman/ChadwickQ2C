import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const backupPath = path.join(process.cwd(), 'data', 'catalog-backup.json');
    if (!fs.existsSync(backupPath)) {
        console.error(`Backup file not found at ${backupPath}`);
        return;
    }

    console.log(`Reading backup file: ${backupPath}`);
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const rawItems = backupData.items;
    
    console.log(`Starting re-import of ${rawItems.length} items...`);

    // Use the same normalization logic I just put in the API
    const items = rawItems
        .filter((item: any) => item.partNumber)
        .map((item: any) => ({
            ...item,
            partNumber: String(item.partNumber).trim(),
            brand: item.brand ? String(item.brand).trim().toLowerCase() : null
        }));

    console.log(`Filtered items count: ${items.length}`);

    // Pre-fetch existing for matching
    const existingItems = await prisma.catalogItem.findMany({
        select: { id: true, partNumber: true, brand: true }
    });
    const existingLookup = new Map(
        existingItems.map(item => {
            const b = item.brand ? item.brand.toLowerCase() : '';
            const p = item.partNumber ? item.partNumber.toLowerCase() : '';
            return [`${b}:${p}`, item.id];
        })
    );

    const BATCH_SIZE = 100;
    let createdCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        await prisma.$transaction(async (tx) => {
            for (const item of batch) {
                const { id, createdAt, updatedAt, ...rest } = item;
                const b = rest.brand ? rest.brand.toLowerCase() : '';
                const p = rest.partNumber ? rest.partNumber.toLowerCase() : '';
                const key = `${b}:${p}`;
                const existingId = existingLookup.get(key);

                if (existingId) {
                    await tx.catalogItem.update({
                        where: { id: existingId },
                        data: rest
                    });
                    updatedCount++;
                } else {
                    await tx.catalogItem.create({
                        data: rest
                    });
                    createdCount++;
                }
            }
        });
        if ((i + BATCH_SIZE) % 1000 === 0 || (i + BATCH_SIZE) >= items.length) {
            console.log(`Processed ${Math.min(i + BATCH_SIZE, items.length)}/${items.length} items...`);
        }
    }

    console.log(`\nRe-import Complete.`);
    console.log(`Created: ${createdCount}`);
    console.log(`Updated: ${updatedCount}`);

    // Final check for Basics/Busbar
    const stats = await prisma.catalogItem.groupBy({
        by: ['category'],
        _count: { id: true }
    });
    console.log('\nFinal Category Stats:');
    console.table(stats);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
