import { Item } from '@prisma/client';

export interface AggregateItem {
    key: string;
    partNumber: string;
    description: string;
    category: string; // [NEW] Added for grouping
    quantity: number;
    unitPrice: number;
    totalCost: number;
    totalLabourHours: number;
}

export interface ComparisonRow {
    key: string;
    partNumber: string;
    description: string;
    category: string; // [NEW] Added for grouping

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
    baselineMaterialTotal: number; // [NEW]
    baselineLabourTotal: number;   // [NEW]
    deltaMaterialCost: number;
    deltaLabourHours: number;
    rowCount: number;
    diffCount: number;
    topDrivers: ComparisonRow[];   // [NEW]
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
        const cat = item.category || 'Uncategorized'; // Capture category

        if (current) {
            current.quantity += qty;
            current.totalCost += cost;
            current.totalLabourHours += labour;
            // Keep first category encountered if mixed (though key should separate usually)
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
    let sumBaseCost = 0;   // [NEW]
    let sumBaseLabour = 0; // [NEW]
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
            sumBaseCost += costBase;     // Only sum baseline for displayed rows? 
            // "Percentage formula: (Delta / Baseline Total) * 100"
            // "If baseline = 0 ... show N/A"
            // Usually Baseline Total refers to the WHOLE board, or just the diff rows?
            // "Percent Cost Change" typically means for the whole scope.
            // But if we only iterate diff rows, we miss non-changing rows in the baseline sum?
            // Wait, if a row hasn't changed, Delta is 0. 
            // If the user wants "% Change of the Board Cost", we need Total Baseline Cost of the WHOLE board.
            // If the user wants "% Change of the Variance", that's different.
            // Context: "Material Change: +$1,200 (+8.4%)" -> This usually implies (Total Delta / Total Baseline Cost) * 100.
            // So we need to sum Baseline Cost for ALL items, not just diffs.

            rows.push({
                key,
                // specific: Prefer Baseline description, fallback to Comparison
                partNumber: base?.partNumber || comp?.partNumber || '?',
                description: base?.description || comp?.description || 'Unknown Item',
                category: base?.category || comp?.category || 'Uncategorized', // Prefer Baseline category
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

    // [CORRECTION] We need Total Baseline Cost for accurate % calculation.
    // Iterating only diff rows means we might miss static items.
    // But `allKeys` includes EVERYTHING from both maps (Union).
    // So iterating `allKeys` covers the entire board scope.
    // The `hasDiff` check filters what pushes to `rows`.
    // We should sum baseline totals OUTSIDE the `hasDiff` check to capture full board value.

    // reset sums and re-loop or do it in the main loop?
    // Let's do it in the main loop but separate the accumulation.

    // Resetting to do it right:
    sumBaseCost = 0;
    sumBaseLabour = 0;

    for (const key of allKeys) {
        const base = baseMap.get(key);
        // We only care about Baseline for the Total Sum
        if (base) {
            sumBaseCost += base.totalCost;
            sumBaseLabour += base.totalLabourHours;
        }
    }

    // Sort rows by part number for readability (Secondary sort if grouped by category later)
    rows.sort((a, b) => a.partNumber.localeCompare(b.partNumber));

    // Top Drivers: Sort by Absolute Material Delta
    const topDrivers = [...rows]
        .sort((a, b) => Math.abs(b.deltaCost) - Math.abs(a.deltaCost))
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
