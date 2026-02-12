import { Item } from '@prisma/client';

export interface AggregateItem {
    key: string;
    partNumber: string;
    description: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalCost: number;
    totalLabourHours: number;
}

export interface ComparisonRow {
    key: string;
    partNumber: string;
    description: string;
    category: string;

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
    baselineMaterialTotal: number;
    baselineLabourTotal: number;
    deltaMaterialCost: number;
    deltaLabourHours: number;
    rowCount: number;
    diffCount: number;
    topDrivers: ComparisonRow[];
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
        // We use PartNumber if present, else Name as fallback for key uniqueness.
        const keyPart = pNum || `(No Part) ${item.name.trim()}`;

        // Include Unit Price in Key to separate overrides. Normalize to 4 decimals to avoid precision issues.
        const uPrice = item.unitPrice || 0;
        const key = `${keyPart}::${Number(uPrice).toFixed(4)}`;

        // 2. Aggregate
        const current = map.get(key);

        const qty = item.quantity || 0;
        const cost = item.cost || 0; // Use stored extended cost
        const labour = item.labourHours || 0;
        // Capture category (prefer existing, but will settle for first found)
        const cat = item.category || 'Uncategorized';

        if (current) {
            current.quantity += qty;
            current.totalCost += cost;
            current.totalLabourHours += labour;
        } else {
            map.set(key, {
                key,
                partNumber: pNum || '-', // Display fallback
                description: item.description || item.name, // Display fallback
                category: cat,
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
    let sumBaseCost = 0;
    let sumBaseLabour = 0;
    let diffCount = 0;

    // 1. Calculate Baseline Totals strictly from Baseline Map (for % calc consistency)
    for (const baseItem of baseMap.values()) {
        sumBaseCost += baseItem.totalCost;
        sumBaseLabour += baseItem.totalLabourHours;
    }

    // 2. Iterate Union of Keys for Row Comparison
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

        // Skip if NO difference (clean state)
        const hasDiff = deltaQty !== 0 || Math.abs(deltaCost) > 0.001 || Math.abs(deltaLabour) > 0.001;

        if (hasDiff) {
            diffCount++;
            sumDeltaCost += deltaCost;
            sumDeltaLabour += deltaLabour;

            rows.push({
                key,
                // specific: Prefer Baseline description/category, fallback to Comparison
                partNumber: base?.partNumber || comp?.partNumber || '?',
                description: base?.description || comp?.description || 'Unknown Item',
                category: base?.category || comp?.category || 'Uncategorized',
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

    // Sort rows by part number for readability (Secondary sort if grouped by category later)
    rows.sort((a, b) => a.partNumber.localeCompare(b.partNumber));

    // Top Drivers: Strictly Positive Increases, Sorted Descending
    const topDrivers = rows
        .filter(r => r.deltaCost > 0)
        .sort((a, b) => b.deltaCost - a.deltaCost)
        .slice(0, 5);

    return {
        rows,
        summary: {
            baselineMaterialTotal: sumBaseCost,
            baselineLabourTotal: sumBaseLabour,
            deltaMaterialCost: sumDeltaCost,
            deltaLabourHours: sumDeltaLabour,
            rowCount: rows.length,
            diffCount,
            topDrivers
        }
    };
};
