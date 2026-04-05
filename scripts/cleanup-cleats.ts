import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Cleanup Cleats: Resets isSystemManaged and isDefault for all cleats.
 * Identifies cleats by category/subcategory: "Busbar Supports"
 */

async function main() {
    console.log('--- CLEAT CLEANUP STARTED ---');
    
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');

    if (isDryRun) {
        console.log('DRY RUN MODE: No changes will be applied.');
    }

    // 1. Fetch all items in the cleat category
    const cleats = await prisma.item.findMany({
        where: {
            OR: [
                { category: { contains: 'Busbar Supports' } },
                { subcategory: { contains: 'Busbar Supports' } }
            ]
        }
    });

    console.log(`Found ${cleats.length} cleat items.`);

    const affected = cleats.filter(c => c.isSystemManaged || c.isDefault);
    console.log(`Units requiring reset (isSystemManaged or isDefault is true): ${affected.length}`);

    if (affected.length === 0) {
        console.log('No cleanup needed.');
        return;
    }

    // 2. Log snapshots if not dry run
    if (!isDryRun) {
        console.log('Resetting flags...');
        const result = await prisma.item.updateMany({
            where: {
                id: { in: affected.map(a => a.id) }
            },
            data: {
                isSystemManaged: false,
                isDefault: false,
                notes: {
                    set: 'SYSTEM_RESET: Manual Authority Restored'
                }
            }
        });
        console.log(`Successfully reset ${result.count} items.`);
    } else {
        console.log('Affected Items Snapshot:');
        affected.forEach(a => {
            console.log(` - ID: ${a.id}, Name: ${a.name}, Qty: ${Number(a.quantity)}, SysManaged: ${a.isSystemManaged}, Default: ${a.isDefault}`);
        });
    }

    console.log('--- CLEANUP COMPLETE ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
