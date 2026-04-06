import { Item } from "@/context/QuoteContext";
import { consolidateItems } from "./items/consolidation";
import { formatCurrency, formatQuantity } from "./utils";

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
 * Forces consolidation as per system requirement.
 * Sorting: Category -> Supplier -> PartNumber (handled by consolidation utility)
 */
export function generateBoardBom(items: Item[], brandLookup: Record<string, string>, options?: BOMOptions): BOMItem[] {
    // FORCE CONSOLIDATION as per critical requirements
    const consolidated = consolidateItems(items);
    
    return consolidated.map(item => ({
        category: item.category || 'Uncategorized',
        supplier: brandLookup[item.partNumber || item.name || ''] || null,
        partNumber: item.partNumber || item.name || 'UNKNOWN',
        description: item.description || item.name,
        quantity: item.quantity,
        unitCost: item.unitPrice,
        extendedCost: item.cost,
        labourHours: item.labourHours * item.quantity 
    }));
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
            formatQuantity(item.quantity),
            formatCurrency(item.unitCost),
            formatCurrency(item.extendedCost),
            item.labourHours.toFixed(2)
        ].map(escapeCsv).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
}
