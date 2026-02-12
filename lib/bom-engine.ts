import { Item } from "@/context/QuoteContext";

export interface BomItem {
    category: string;
    supplier: string | null;
    partNumber: string;
    description: string;
    quantity: number;
    unitCost: number;       // Raw value
    extendedCost: number;   // Raw value
    labourHours: number;    // Raw value
}

export interface CanonicalBOM {
    items: BomItem[];
    totals: {
        totalMaterialCost: number;
        totalLabourHours: number;
    };
    meta: {
        boardName: string;
        timestamp: string;
    };
}

/**
 * Generates a deterministic, canonical BOM model from board items.
 * 
 * - Aggregation Key: PartNumber + UnitPrice (toFixed(4))
 * - Values: Raw numbers (no rounding)
 * - Sorting: Category -> Supplier -> PartNumber
 */
export function generateCanonicalBOM(
    items: Item[],
    brandLookup: Record<string, string>,
    boardName: string
): CanonicalBOM {
    const aggregation: Record<string, BomItem> = {};
    let totalMaterialCost = 0;
    let totalLabourHours = 0;

    for (const item of items) {
        // Exclude items with <= 0 quantity
        if (item.quantity <= 0) continue;

        const partNumber = item.partNumber || item.name || 'UNKNOWN';
        const unitPrice = item.unitPrice || 0;

        // Composite Key for Aggregation: PartNumber + Normalized Price
        // Using 4dp for key generation ONLY to prevent float key mismatches
        const priceKey = unitPrice.toFixed(4);
        const compositeKey = `${partNumber}::${priceKey}`;

        if (!aggregation[compositeKey]) {
            // Initialize
            const brand = brandLookup[partNumber] || null;

            aggregation[compositeKey] = {
                category: item.category || 'Uncategorized',
                supplier: brand, // Map Brand -> Supplier field
                partNumber: partNumber,
                description: item.description || item.name,
                quantity: 0,
                unitCost: unitPrice, // Store raw unit price
                extendedCost: 0,
                labourHours: 0
            };
        }

        // Aggregate
        const bomItem = aggregation[compositeKey];
        bomItem.quantity += item.quantity;

        const itemExtendedCost = item.quantity * unitPrice;
        const itemLabourHours = item.quantity * (item.labourHours || 0);

        bomItem.extendedCost += itemExtendedCost;
        bomItem.labourHours += itemLabourHours;

        // Accumulate Grand Totals
        totalMaterialCost += itemExtendedCost;
        totalLabourHours += itemLabourHours;
    }

    // Convert to Array
    const resultItems = Object.values(aggregation);

    // Deterministic Sort
    resultItems.sort((a, b) => {
        // 1. Category (A-Z)
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        if (catA !== catB) return catA.localeCompare(catB);

        // 2. Supplier (A-Z)
        const supA = (a.supplier || '').toLowerCase();
        const supB = (b.supplier || '').toLowerCase();
        if (supA !== supB) return supA.localeCompare(supB);

        // 3. Part Number (A-Z)
        const partA = (a.partNumber || '').toLowerCase();
        const partB = (b.partNumber || '').toLowerCase();
        return partA.localeCompare(partB);
    });

    return {
        items: resultItems,
        totals: {
            totalMaterialCost,
            totalLabourHours
        },
        meta: {
            boardName,
            timestamp: new Date().toISOString()
        }
    };
}
