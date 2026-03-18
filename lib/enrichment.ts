import prisma from '@/lib/prisma';

export async function fetchEnrichedBoardItems(boardId: string) {
    const items = await prisma.item.findMany({
        where: { boardId },
        orderBy: { createdAt: 'asc' }
    });

    if (items.length === 0) return [];

    return enrichItems(items);
}

export async function enrichItems(items: any[]) {
    if (items.length === 0) return [];

    // 1. Collect all potential identifiers (partNumber or name)
    const identifiers = new Set<string>();
    items.forEach(item => {
        const id = (item.partNumber || item.name || '').trim();
        if (id) identifiers.add(id);
    });

    if (identifiers.size === 0) return items.map(i => ({ ...i, isSheetmetal: false, isCatalogMatch: false }));

    // 2. Fetch Catalog Details using set of all possible identifiers
    const catalogItems = await prisma.catalogItem.findMany({
        where: {
            partNumber: { in: Array.from(identifiers) }
        },
        select: {
            partNumber: true,
            totalCopperWeightKgPerMeter: true,
            isCopperPriced: true,
            isSheetmetal: true
        }
    });

    // 3. Create Map (Keys are trimmed PartNumbers)
    const catalogMap = new Map<string, { totalCopperWeightKgPerMeter: number | null, isCopperPriced: boolean, isSheetmetal: boolean }>();
    catalogItems.forEach(ci => {
        if (ci.partNumber) {
            catalogMap.set(ci.partNumber.trim(), {
                totalCopperWeightKgPerMeter: ci.totalCopperWeightKgPerMeter,
                isCopperPriced: ci.isCopperPriced,
                isSheetmetal: ci.isSheetmetal || false
            });
        }
    });

    // 4. Merge into Items with Fallback and Logging
    return items.map(item => {
        const pNum = (item.partNumber || '').trim();
        const nameId = (item.name || '').trim();
        
        let catalogData = null;
        let matchField = 'none';

        // Priority 1: Exact partNumber match
        if (pNum && catalogMap.has(pNum)) {
            catalogData = catalogMap.get(pNum);
            matchField = 'partNumber';
        } 
        // Priority 2: Fallback to name match
        else if (nameId && catalogMap.has(nameId)) {
            catalogData = catalogMap.get(nameId);
            matchField = 'name';
        }

        if (catalogData) {
            console.log(`[Enrichment] MATCH FOUND | Item: '${item.name}' | ID used: '${catalogData === catalogMap.get(pNum) ? pNum : nameId}' | Field: ${matchField} | isSheetmetal: ${catalogData.isSheetmetal}`);
        } else {
            // Only log 1B potential misses
            if (item.name?.startsWith('1B-') || item.partNumber?.startsWith('1B-')) {
                console.warn(`[Enrichment] MATCH FAILED | Item: '${item.name}' | PartNum: '${item.partNumber}' | Searched identifiers: [${pNum}, ${nameId}]`);
            }
        }

        return {
            ...item,
            totalCopperWeightKgPerMeter: catalogData?.totalCopperWeightKgPerMeter ?? null,
            isCopperPriced: catalogData?.isCopperPriced ?? false,
            isSheetmetal: catalogData ? (catalogData.isSheetmetal ?? false) : false,
            isCatalogMatch: !!catalogData
        };
    });
}
