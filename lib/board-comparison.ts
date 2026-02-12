import { Item } from '@prisma/client';

export interface AggregateItem {
    key: string;
    partNumber: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalCost: number;
    totalLabourHours: number;
}

export interface ComparisonRow {
    key: string;
    partNumber: string;
    description: string;

    // Baseline
    qtyBase: number;
    costBase: number;
    labourBase: number;

    // Comparison
    qtyComp: number;
    costComp: number;
    labourComp: number;

    // Deltas (Comp - Base)
    deltaQty: number;
    deltaCost: number;
    deltaLabour: number;
}

export interface ComparisonSummary {
    deltaMaterialCost: number;
    deltaLabourHours: number;
    rowCount: number;
    diffCount: number;
}

/**
 * Normalizes a Part Number for display/key generation (Trim only per requirements)
 */
const cleanPart = (p: string | null) => (p || '').trim();

/**
 * Aggregates Board Items by PartNumber + UnitPrice.
 * @param items List of raw Prisma Items
 */
export const aggregateBoardItems = (items: Item[]): Map<string, AggregateItem> => {
    const map = new Map<string, AggregateItem>();

    for (const item of items) {
        // 1. Generate Composite Key
        const pNum = cleanPart(item.partNumber);

        // Skip if no part number? Requirements say "Group by partNumber". 
        // If partNumber is missing, it's likely a custom item without part #. 
        // We should probably group by Name in that case or just PartNumber? 
        // "must compare by partNumber" -> Implies PartNumber is the specific key.
        // If empty, let's treat as "No Part Number" group or use Name?
        // Let's use PartNumber if present, else Name as fallback for key uniqueness.
        const keyPart = pNum || `(No Part) ${item.name.trim()}`;

        // Include Unit Price in Key to separate overrides
        const uPrice = item.unitPrice || 0;
        const key = `${keyPart}::${uPrice.toFixed(2)}`;

        // 2. Aggregate
        const current = map.get(key);

        const qty = item.quantity || 0;
        const cost = item.cost || 0; // Use stored extended cost
        const labour = item.labourHours || 0;

        if (current) {
            current.quantity += qty;
            current.totalCost += cost;
            current.totalLabourHours += labour;
        } else {
            map.set(key, {
                key,
                partNumber: pNum || '-', // Display fallback
                description: item.description || item.name, // Display fallback
                quantity: qty,
                unitPrice: uPrice,
                totalCost: cost,
                totalLabourHours: labour
            });
        }
    }

    return map;
};

/**
 * Compares two aggregated maps.
 * Returns rows and summary.
 */
export const compareAggregations = (
    baseMap: Map<string, AggregateItem>,
    compMap: Map<string, AggregateItem>
): { rows: ComparisonRow[], summary: ComparisonSummary } => {

    const rows: ComparisonRow[] = [];
    const allKeys = new Set([...baseMap.keys(), ...compMap.keys()]);

    let sumDeltaCost = 0;
    let sumDeltaLabour = 0;
    let diffCount = 0;

    for (const key of allKeys) {
        const base = baseMap.get(key);
        const comp = compMap.get(key);

        // Extract values with safety defaults
        const qtyBase = base?.quantity || 0;
        const costBase = base?.totalCost || 0;
        const labourBase = base?.totalLabourHours || 0;

        const qtyComp = comp?.quantity || 0;
        const costComp = comp?.totalCost || 0;
        const labourComp = comp?.totalLabourHours || 0;

        // Calculate Deltas (Comp - Base)
        const deltaQty = qtyComp - qtyBase;
        const deltaCost = costComp - costBase;
        const deltaLabour = labourComp - labourBase;

        // Skip if NO difference? "If no differences exist, show clean 'No differences detected'"
        // This implies we want to see rows where Delta != 0.
        // What if only Description changed? Key strategy ignores description. 
        // If Qty, Cost, Labour are identical, is it a diff? No.
        const hasDiff = deltaQty !== 0 || Math.abs(deltaCost) > 0.001 || Math.abs(deltaLabour) > 0.001;

        if (hasDiff) {
            diffCount++;
            sumDeltaCost += deltaCost;
            sumDeltaLabour += deltaLabour;

            rows.push({
                key,
                // specific: Prefer Baseline description, fallback to Comparison
                partNumber: base?.partNumber || comp?.partNumber || '?',
                description: base?.description || comp?.description || 'Unknown Item',
                qtyBase,
                costBase,
                labourBase,
                qtyComp,
                costComp,
                labourComp,
                deltaQty,
                deltaCost,
                deltaLabour
            });
        }
    }

    // Sort rows by part number for readability
    rows.sort((a, b) => a.partNumber.localeCompare(b.partNumber));

    return {
        rows,
        summary: {
            deltaMaterialCost: sumDeltaCost,
            deltaLabourHours: sumDeltaLabour,
            rowCount: rows.length,
            diffCount
        }
    };
};
