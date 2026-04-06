import { Item } from "@/context/QuoteContext";

export interface ConsolidatedItem extends Item {
    isConsolidated?: boolean;
    originalIds?: string[];
    pricingWarning?: boolean;
}

/**
 * Consolidates items by Part Number and Brand (Supplier).
 * 
 * Logic:
 * 1. Filter out items where mergeable === false (they stay separate)
 * 2. Group mergeable items by partNumber + unitPrice (to detect pricing inconsistencies)
 * 3. Sum quantities and recalculate costs/labour
 * 4. Re-apply canonical sorting
 */
export function consolidateItems(items: Item[]): ConsolidatedItem[] {
    if (!items || items.length === 0) return [];

    const mergeableItems = items.filter(i => i.mergeable !== false);
    const nonMergeableItems = items.filter(i => i.mergeable === false);

    // Grouping structure: Map<partNumber, Map<unitPrice, ConsolidatedItem>>
    const groups = new Map<string, Map<number, ConsolidatedItem>>();
    
    // Track part numbers for pricing warnings
    const partNumberPrices = new Map<string, Set<number>>();

    for (const item of mergeableItems) {
        const partNumber = (item.partNumber || item.name || 'UNKNOWN').trim();
        const unitPrice = item.unitPrice || 0;

        // Track price for warning
        if (!partNumberPrices.has(partNumber)) {
            partNumberPrices.set(partNumber, new Set());
        }
        partNumberPrices.get(partNumber)?.add(unitPrice);

        if (!groups.has(partNumber)) {
            groups.set(partNumber, new Map());
        }

        const priceMap = groups.get(partNumber)!;
        
        if (!priceMap.has(unitPrice)) {
            // First item in this group
            priceMap.set(unitPrice, {
                ...item,
                isConsolidated: false, // Start as false, set to true later if we find more
                originalIds: [item.id],
                quantity: Number(item.quantity),
                cost: Number(item.cost),
                labourHours: Number(item.labourHours) * Number(item.quantity) // Store total hours for aggregation
            } as ConsolidatedItem);
        } else {
            // Aggregate
            const consolidated = priceMap.get(unitPrice)!;
            consolidated.quantity = Number(consolidated.quantity) + Number(item.quantity);
            consolidated.cost = Number(consolidated.cost) + Number(item.cost);
            consolidated.labourHours = Number(consolidated.labourHours) + (Number(item.labourHours) * Number(item.quantity));
            consolidated.originalIds?.push(item.id);
            consolidated.isConsolidated = true; // Now we have at least two
            
            // If descriptions differ, we could append or keep first. Let's keep first for BOM cleanliness.
        }
    }

    // Convert groups back to array and apply pricing warnings
    const consolidatedMergeable: ConsolidatedItem[] = [];
    
    for (const [partNumber, priceMap] of groups.entries()) {
        const isMultiplePrices = (partNumberPrices.get(partNumber)?.size || 0) > 1;
        
        for (const [unitPrice, item] of priceMap.entries()) {
            // Re-normalize labour hours back to per-unit for consistent rendering
            if (item.quantity > 0) {
                item.labourHours = item.labourHours / item.quantity;
            }
            
            if (isMultiplePrices) {
                item.pricingWarning = true;
            }
            consolidatedMergeable.push(item);
        }
    }

    // Combine and Sort
    const allItems = [...consolidatedMergeable, ...nonMergeableItems];

    return sortItemsCanonically(allItems);
}

/**
 * Canonically sorts items:
 * 1. Basics -> Switchboard -> Busbar -> Other
 * 2. Supplier (Brand)
 * 3. Part Number
 */
export function sortItemsCanonically<T extends { category?: string; partNumber?: string | null; name?: string }>(items: T[]): T[] {
    const categoryOrder = ['Basics', 'Switchboard', 'Busbar', 'Other'];

    return [...items].sort((a, b) => {
        // 1. Category
        const indexA = categoryOrder.indexOf(a.category || 'Other');
        const indexB = categoryOrder.indexOf(b.category || 'Other');
        const orderA = indexA === -1 ? 99 : indexA;
        const orderB = indexB === -1 ? 99 : indexB;
        
        if (orderA !== orderB) return orderA - orderB;

        // 2. Supplier (Assume partNumber contains it or use brand if available in metadata?)
        // Currently, we don't have a direct 'supplier' field on Item, but we often use brand in exports.
        // Let's stick to PartNumber for now as secondary sort if supplier is not present.
        const partA = (a.partNumber || a.name || '').toLowerCase();
        const partB = (b.partNumber || b.name || '').toLowerCase();
        
        return partA.localeCompare(partB);
    });
}
