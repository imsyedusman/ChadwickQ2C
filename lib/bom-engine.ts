import { Item } from "@/context/QuoteContext";
import { consolidateItems } from "./items/consolidation";

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

export interface QuoteBOM {
    quoteNumber: string;
    clientName?: string | null;
    companyName?: string | null;
    projectName?: string | null;
    boards: CanonicalBOM[];
    grandTotals: {
        totalMaterialCost: number;
        totalLabourHours: number;
    };
    timestamp: string;
}

/**
 * Generates a deterministic, canonical BOM model from board items.
 * 
 * Uses the Consolidation Layer to resolve duplicates.
 */
export function generateCanonicalBOM(
    items: Item[],
    brandLookup: Record<string, string>,
    boardName: string
): CanonicalBOM {
    const consolidated = consolidateItems(items).filter(i => i.subcategory !== 'Price Adjustment');
    
    let totalMaterialCost = 0;
    let totalLabourHours = 0;

    const resultItems: BomItem[] = consolidated.map(item => {
        const itemExtendedCost = item.cost;
        const itemLabourHoursTotal = item.labourHours * item.quantity;

        totalMaterialCost += itemExtendedCost;
        totalLabourHours += itemLabourHoursTotal;

        return {
            category: item.category || 'Uncategorized',
            supplier: brandLookup[item.partNumber || item.name || ''] || null,
            partNumber: item.partNumber || item.name || 'UNKNOWN',
            description: item.description || item.name,
            quantity: item.quantity,
            unitCost: item.unitPrice,
            extendedCost: itemExtendedCost,
            labourHours: itemLabourHoursTotal
        };
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
