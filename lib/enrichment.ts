import prisma from '@/lib/prisma';

export async function fetchEnrichedBoardItems(boardId: string) {
    const items = await prisma.item.findMany({
        where: { boardId },
        orderBy: { createdAt: 'asc' }
    });

    if (items.length === 0) return [];

    // 1. Collect all Part Numbers
    const partNumbers = new Set<string>();
    items.forEach(item => {
        if (item.partNumber) partNumbers.add(item.partNumber);
    });

    // 2. Fetch Catalog Details
    const catalogItems = await prisma.catalogItem.findMany({
        where: {
            partNumber: { in: Array.from(partNumbers) }
        },
        select: {
            partNumber: true,
            totalCopperWeightKgPerMeter: true,
            isCopperPriced: true
        }
    });

    // 3. Create Map
    const catalogMap = new Map<string, { totalCopperWeightKgPerMeter: number | null, isCopperPriced: boolean }>();
    catalogItems.forEach(ci => {
        if (ci.partNumber) {
            catalogMap.set(ci.partNumber, {
                totalCopperWeightKgPerMeter: ci.totalCopperWeightKgPerMeter,
                isCopperPriced: ci.isCopperPriced
            });
        }
    });

    // 4. Merge into Items
    return items.map(item => {
        const catalogData = item.partNumber ? catalogMap.get(item.partNumber) : null;
        return {
            ...item,
            totalCopperWeightKgPerMeter: catalogData?.totalCopperWeightKgPerMeter ?? null,
            isCopperPriced: catalogData?.isCopperPriced ?? false
        };
    });
}
