import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting deduplication of CatalogItem rows with identical fields and missing part numbers...');

    // 1. Fetch all items where partNumber is NULL or '-'
    const items = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { partNumber: null },
                { partNumber: '-' },
                { partNumber: '' } // Catch empty strings just in case
            ],
        },
        orderBy: [
            { createdAt: 'asc' }, // Order by oldest first
            { id: 'asc' },        // Stable tie-breaker
        ],
    });

    console.log(`Found ${items.length} items without a valid part number.`);

    // 2. Group items by exact identifying fields
    const groupedItems = new Map<string, typeof items>();

    for (const item of items) {
        // Construct a composite key of relevant identifying fields
        const key = JSON.stringify({
            description: item.description?.trim().toLowerCase() || '',
            brand: item.brand?.trim().toLowerCase() || '',
            unitPrice: item.unitPrice,
            labourHours: item.labourHours,
            category: item.category?.trim().toLowerCase() || '',
            subcategory: item.subcategory?.trim().toLowerCase() || '',
            imageUrl: item.imageUrl?.trim() || '',
            isAutoAdd: item.isAutoAdd,
            defaultQuantity: item.defaultQuantity,
            totalCopperWeightKgPerMeter: item.totalCopperWeightKgPerMeter,
            isCopperPriced: item.isCopperPriced,
            notes: item.notes?.trim().toLowerCase() || '',
            meterType: item.meterType?.trim().toLowerCase() || '',
            isSheetmetal: item.isSheetmetal,
            productFrame: item.productFrame?.trim().toLowerCase() || '',
            mccbVariant: item.mccbVariant?.trim().toLowerCase() || '',
            mccbRole: item.mccbRole?.trim().toLowerCase() || '',
            // Note: components JSON is ignored here, assuming missing partNumber items rarely have complex components
            // or if they do, the stringified version might be slightly different. But for exact dedupe we stringify it.
            components: item.components ? JSON.stringify(item.components) : null,
        });

        if (!groupedItems.has(key)) {
            groupedItems.set(key, []);
        }
        groupedItems.get(key)!.push(item);
    }

    // 3. Process groups to find duplicates and keep only the oldest
    let totalGroupsProcessed = 0;
    let totalRowsDeleted = 0;
    const deletedIds: string[] = [];

    for (const [key, group] of groupedItems.entries()) {
        if (group.length > 1) {
            totalGroupsProcessed++;

            // Since we ordered by createdAt asc and id asc during fetch,
            // the first item is the oldest.
            const [oldestItem, ...duplicates] = group;

            for (const duplicate of duplicates) {
                deletedIds.push(duplicate.id);
            }
            totalRowsDeleted += duplicates.length;
        }
    }

    // 4. Perform the deletion (Safe: only exact duplicates)
    if (deletedIds.length > 0) {
        console.log(`\nIdentified ${totalGroupsProcessed} groups with duplicates.`);
        console.log(`Preparing to delete ${totalRowsDeleted} duplicate rows...`);

        const batchSize = 100;
        for (let i = 0; i < deletedIds.length; i += batchSize) {
            const batchIds = deletedIds.slice(i, i + batchSize);

            await prisma.catalogItem.deleteMany({
                where: {
                    id: {
                        in: batchIds,
                    },
                },
            });

            console.log(`Deleted batch of ${batchIds.length} items...`);
        }

        console.log('\n--- Deduplication Summary ---');
        console.log(`Total duplicate groups processed: ${totalGroupsProcessed}`);
        console.log(`Total rows deleted: ${totalRowsDeleted}`);
        console.log('Deleted IDs:');
        deletedIds.forEach(id => console.log(`  - ${id}`));
    } else {
        console.log('No duplicates found among items without valid part numbers.');
    }

    console.log('\nDeduplication run complete.');
}

main()
    .catch((e) => {
        console.error('Error running script:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
