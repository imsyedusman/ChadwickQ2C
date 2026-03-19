const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicates() {
    const isDryRun = process.argv.includes('--dry-run');
    console.log(`[CLEANUP] Starting catalog deduplication... ${isDryRun ? '(DRY RUN)' : '(LIVE MODE)'}`);

    try {
        // 1. Fetch all catalog items
        const allItems = await prisma.catalogItem.findMany({
            select: {
                id: true,
                partNumber: true,
                brand: true,
                updatedAt: true
            }
        });

        console.log(`[CLEANUP] Found ${allItems.length} total items.`);

        // 2. Map items by normalized key (brand:partnumber)
        const groups = new Map<string, typeof allItems>();

        for (const item of allItems) {
            const normalizedBrand = (item.brand || '').trim().toLowerCase();
            const normalizedPart = (item.partNumber || '').trim().toLowerCase();
            const key = `${normalizedBrand}:${normalizedPart}`;

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(item);
        }

        let totalDeleted = 0;
        let totalNormalized = 0;

        // 3. Process each group
        for (const [key, items] of groups.entries()) {
            // Check if any item in the group needs normalization in the DB
            for (const item of items) {
                const normBrand = (item.brand || '').trim().toLowerCase();
                const normPart = (item.partNumber || '').trim().toLowerCase();
                
                if (item.brand !== normBrand || item.partNumber !== normPart) {
                    if (!isDryRun) {
                        await prisma.catalogItem.update({
                            where: { id: item.id },
                            data: {
                                brand: normBrand,
                                partNumber: normPart
                            }
                        });
                    }
                    totalNormalized++;
                }
            }

            if (items.length > 1) {
                // Sort by updatedAt DESC, then ID ASC for tie-breaking
                const sorted = [...items].sort((a, b) => {
                    const timeDiff = b.updatedAt.getTime() - a.updatedAt.getTime();
                    if (timeDiff !== 0) return timeDiff;
                    return a.id.localeCompare(b.id);
                });

                const [keeper, ...duplicates] = sorted;

                console.log(`[CLEANUP] Key "${key}": Keeping ${keeper.id}, Deleting ${duplicates.length} duplicates.`);
                
                for (const dup of duplicates) {
                    console.log(`[CLEANUP]   - Deleting: ${dup.id} (part: ${dup.partNumber}, brand: ${dup.brand}, updated: ${dup.updatedAt.toISOString()})`);
                    if (!isDryRun) {
                        await prisma.catalogItem.delete({
                            where: { id: dup.id }
                        });
                    }
                    totalDeleted++;
                }
            }
        }

        console.log(`\n[CLEANUP] Summary:`);
        console.log(` - Normalized: ${totalNormalized} items`);
        console.log(` - Deleted: ${totalDeleted} duplicates`);
        console.log(`[CLEANUP] Done.`);

    } catch (error) {
        console.error(`[CLEANUP] FATAL ERROR:`, error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupDuplicates();
