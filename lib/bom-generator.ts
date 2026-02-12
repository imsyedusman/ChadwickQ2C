import { Item } from "@/context/QuoteContext";

export interface BOMItem {
    category: string;
    supplier: string | null;
    partNumber: string;
    description: string;
    quantity: number;
    unitCost: number;
    extendedCost: number;
    labourHours: number;
}

export interface BOMOptions {
    includeLabour?: boolean;
}

/**
 * Generates a deterministic BOM from a list of board items.
 * 
 * Aggregation Key: PartNumber + UnitPrice (toFixed(4))
 * Sorting: Category -> Supplier -> PartNumber
 */
export function generateBoardBom(items: Item[], brandLookup: Record<string, string>, options?: BOMOptions): BOMItem[] {
    const aggregation: Record<string, BOMItem> = {};

    for (const item of items) {
        // Skip items with <= 0 quantity
        if (item.quantity <= 0) continue;

        const partNumber = item.partNumber || item.name || 'UNKNOWN';
        const unitPrice = item.unitPrice || 0;

        // Composite Key for Aggregation: PartNumber + Normalized Price
        // This ensures we don't merge items with different cost bases
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
                unitCost: unitPrice,
                extendedCost: 0,
                labourHours: 0
            };
        }

        // Aggregate
        const bomItem = aggregation[compositeKey];
        bomItem.quantity += item.quantity;
        bomItem.extendedCost += (item.quantity * unitPrice);
        bomItem.labourHours += (item.quantity * (item.labourHours || 0));
    }

    // Convert to Array
    const result = Object.values(aggregation);

    // Deterministic Sort
    result.sort((a, b) => {
        // 1. Category (A-Z)
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        if (catA !== catB) return catA.localeCompare(catB);

        // 2. Supplier (A-Z) - Nulls last or first? Usually empty strings effectively.
        const supA = (a.supplier || '').toLowerCase();
        const supB = (b.supplier || '').toLowerCase();
        if (supA !== supB) return supA.localeCompare(supB);

        // 3. Part Number (A-Z)
        const partA = (a.partNumber || '').toLowerCase();
        const partB = (b.partNumber || '').toLowerCase();
        return partA.localeCompare(partB);
    });

    // Final Polish: Ensure extendedCost is 2dp (already numbers, but for cleanliness)
    // Actually, we'll handle formatting in CSV string generation.
    // However, JS float math might need rounding.
    for (const item of result) {
        item.extendedCost = Math.round(item.extendedCost * 100) / 100;
    }

    return result;
}

/**
 * Converts BOM Items to WorkGuru-compatible CSV format.
 * Columns: Category, Supplier, Part Number, Description, Quantity, Unit Cost, Extended Cost, Labour Hours
 */
export function toCSV(bomItems: BOMItem[]): string {
    const headers = [
        'Category',
        'Supplier',
        'Part Number',
        'Description',
        'Quantity',
        'Unit Cost',
        'Extended Cost',
        'Labour Hours'
    ];

    const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = bomItems.map(item => {
        return [
            item.category,
            item.supplier,
            item.partNumber,
            item.description,
            item.quantity,
            item.unitCost.toFixed(4),     // 4 decimals for unit cost accuracy
            item.extendedCost.toFixed(2), // 2 decimals for total validation
            item.labourHours.toFixed(2)
        ].map(escapeCsv).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}
