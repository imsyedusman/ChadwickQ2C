
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

    console.log(`Reading backup file to recover internal labour hours: ${backupPath}`);
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const backupItems = backupData.items;
    
    // Strategy 1: Map by PartNumber + Brand
    const brandPartMap = new Map();
    // Strategy 2: Map by PartNumber only (Fallback)
    const partOnlyMap = new Map();

    backupItems.forEach((item: any) => {
        if (item.partNumber && item.labourHours > 0) {
            const p = item.partNumber.trim().toLowerCase();
            const b = item.brand ? item.brand.toLowerCase() : null;
            
            if (b) {
                brandPartMap.set(`${b}:${p}`, item.labourHours);
            }
            // Always set partOnlyMap as fallback, prioritize first found or highest?
            // Usually, part numbers are unique in our catalog.
            if (!partOnlyMap.has(p) || partOnlyMap.get(p) < item.labourHours) {
                partOnlyMap.set(p, item.labourHours);
            }
        }
    });

    console.log(`Indexed ${brandPartMap.size} brand-specific items and ${partOnlyMap.size} unique part numbers from backup.`);

    // Find current items with 0 labour hours
    const currentWipedItems = await prisma.catalogItem.findMany({
        where: { labourHours: 0 }
    });

    console.log(`Currently ${currentWipedItems.length} items in DB have 0 labour hours.`);

    let restoredCount = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < currentWipedItems.length; i += BATCH_SIZE) {
        const batch = currentWipedItems.slice(i, i + BATCH_SIZE);
        
        await prisma.$transaction(async (tx) => {
            for (const item of batch) {
                const p = item.partNumber?.trim().toLowerCase();
                if (!p) continue;

                const b = item.brand ? item.brand.toLowerCase() : null;
                
                let backupLabour = null;
                
                // 1. Try brand-specific match
                if (b) {
                    backupLabour = brandPartMap.get(`${b}:${p}`);
                }

                // 2. Try part-only match
                if (backupLabour === null || backupLabour === undefined) {
                    backupLabour = partOnlyMap.get(p);
                }

                if (backupLabour !== undefined && backupLabour > 0) {
                    await tx.catalogItem.update({
                        where: { id: item.id },
                        data: { labourHours: backupLabour }
                    });
                    restoredCount++;
                }
            }
        });

        if ((i + BATCH_SIZE) % 500 === 0 || (i + BATCH_SIZE) >= currentWipedItems.length) {
            console.log(`Processed ${Math.min(i + BATCH_SIZE, currentWipedItems.length)}/${currentWipedItems.length} items...`);
        }
    }

    console.log(`\nRepair Complete.`);
    console.log(`Restored Labour Hours for ${restoredCount} items using historical enrichment data.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
