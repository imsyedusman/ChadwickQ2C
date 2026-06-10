import { CatalogItem } from '@prisma/client';
import { normalizeSubcategory } from './category-utils';
// Define a type that covers both CatalogItem and board Item (which has similar fields)
// We align fields to ensure both can be passed in.
export interface SortableItem {
    category?: string | null;      // Master: Basics, Switchboard, Busbar
    subcategory?: string | null;   // e.g. "Circuit Breakers > MCCB > 25kA"
    name?: string | null;          // Part Number (Item) or Part Number (CatalogItem via alias)
    partNumber?: string | null;    // CatalogItem has partNumber
    description?: string | null;
    brand?: string | null;

    // Structured Category Fields (Future-proofing / if available)
    categoryPathSegments?: string[];
    categoryBreadcrumbs?: string[];
}

const MASTER_CATEGORY_ORDER: Record<string, number> = {
    'Basics': 0,
    'Switchboard': 1,
    'Busbar': 2
};

const SWITCHGEAR_L1_ORDER: Record<string, number> = {
    'Circuit Breakers': 1,
    'Switches': 2,
    'Miscellaneous': 3
};

const MISC_L2_ORDER: Record<string, number> = {
    'Contactor': 1,
    'General Control': 2,
    'Power Metering': 3,
    'Fuses': 4
};

const MCCB_ACCESSORY_ORDER: Record<string, number> = {
    'Terminal Shield': 1,
    'Rotary Handle': 2
};

const POWER_METER_BRAND_ORDER: Record<string, number> = {
    'Schneider Electric': 1,
    'MERCS': 2,
    'NHP': 3,
    'IPD': 4
};

const SCHNEIDER_METER_ORDER = [
    'A9MEM3155',
    'A9MEM3355',
    'A9MEM3255',
    'METSEPM3250',
    'METSEPM5110',
    'METSEPM5350',
    'METSEPM5560',
    'METSEPM8240',
    'LV434000',
    'LV434001',
    'LV434002',
    'LV434205',
    'LV454444',
    'TRV00217',
    'TRV00121',
    'LV434128',
    'LV434201'
];

const MERCS_METER_ORDER = [
    'INT-STRIDER-M72-MODBUS-96MM',
    'INT-STRIDER-M73-ETHERNET-96MM'
];

const NHP_METER_ORDER = [
    'EM2172RVV53XOSX',
    'EM24DINAV93XISX',
    'EM24DINAV53DISX',
    'MF72421',
    'NEMO96HD1000',
    'NEMO96HD1300',
    'EM27072DMV53X2SN'
];

const IPD_METER_ORDER = [
    '48250402',
    '48250500',
    '48250501',
    '48290105',
    '48290106',
    '48290102',
    '48290110',
    '48290111',
    '48290128',
    '48290130',
    '48290112',
    '48290101',
    '48290200',
    '48290204',
    '48290500',
    '48290501',
    '48290502',
    '48290503',
    '48290504',
    '48290505',
    '48290506'
];

export function getSortParts(item: SortableItem): any[] {
    const parts: any[] = [];

    // 1. Group Order (Basics -> Switchboard -> Busbar)
    const masterCat = item.category || 'Switchboard';
    const masterOrder = MASTER_CATEGORY_ORDER[masterCat] ?? 99;
    parts.push(masterOrder);

    // 2. Category Hierarchy & Structured Segments
    let segments: string[] = [];

    // Priority 1: Structured Fields
    if (item.categoryPathSegments && item.categoryPathSegments.length > 0) {
        segments = item.categoryPathSegments;
    } else if (item.categoryBreadcrumbs && item.categoryBreadcrumbs.length > 0) {
        segments = item.categoryBreadcrumbs;
    } else {
        segments = normalizeSubcategory(item.subcategory, masterCat);
    }

    // Iterate segments and inject priority/numeric values
    let inMccbAccessories = false;

    for (let i = 0; i < segments.length; i++) {
        let seg = segments[i];

        let priority = 999999; // Default high (neutral)
        let val: string | number = seg;

        // Context checks
        if (masterCat === 'Switchboard') {
            // L1 Order
            if (i === 0 && SWITCHGEAR_L1_ORDER[seg]) {
                priority = SWITCHGEAR_L1_ORDER[seg];
            } 
            // L2 Order (if inside Miscellaneous)
            else if (i === 1 && segments[0] === 'Miscellaneous' && MISC_L2_ORDER[seg]) {
                priority = MISC_L2_ORDER[seg];
            }

            if (seg === 'MCCB Accessories') {
                inMccbAccessories = true;
            }
        }

        if (inMccbAccessories) {
            // Check for Priority Children
            if (seg.includes('Terminal Shield')) priority = 1;
            else if (seg.includes('Rotary Handle')) priority = 2;
            else priority = 3;
        }

        // Fault Rating Check (e.g. "25kA") - Sort numerically
        const faultMatch = seg.match(/^(\d+)\s*kA$/i);
        if (faultMatch) {
            priority = parseInt(faultMatch[1]);
        }

        parts.push(priority);
        parts.push(val);
    }

    // 3. Fallback MCCB Accessories Ordering (For items in the same folder lacking child segments)
    // If segments didn't differentiate (e.g. both in "MCCB Accessories" flat), 
    // we assume the loop above yielded equal parts.
    // Now check Name/SKU to force order.

    // Are we in MCCB Accessories context effectively?
    // Use the flag computed during loop, or re-check segments (safe)
    const effectiveInAccessories = inMccbAccessories || segments.includes('MCCB Accessories');

    if (effectiveInAccessories) {
        let accessorySkuOrder = 3;
        const name = (item.partNumber || item.name || '').toUpperCase();

        // Terminal Shields
        if (['LV429517', 'LV432593', '33628'].includes(name)) accessorySkuOrder = 1;
        // Rotary Handles
        else if (['LV429338T', 'LV432598T', '33873'].includes(name)) accessorySkuOrder = 2;

        parts.push(accessorySkuOrder);
    } else {
        parts.push(0);
    }

    // 4. Breaker Specifics (Current Rating)
    // Heuristic: Is it a breaker?
    const isBreaker = segments.some(s => s.includes('Circuit Breaker') || s.includes('MCCB') || s.includes('MCB')) ||
        (item.description && item.description.match(/\b(kA)\b/i));

    if (isBreaker) {
        // Extract Current Rating (Amps) - Numeric Sort
        let ampRating = 99999;
        const ampRegex = /(\d+)\s*A\b/i; // Matches 160A, 250A

        // Description is usually best bet for Amps
        if (item.description) {
            const match = item.description.match(ampRegex);
            if (match) ampRating = parseInt(match[1]);
        }

        parts.push(ampRating);
    } else {
        parts.push(99999);
    }

    // 4.5. Power Meter Custom Ordering
    const isPowerMeter = segments.includes('Power Metering') || segments.includes('Power Meters');
    if (isPowerMeter) {
        // We normalize the brand just in case it wasn't pre-normalized for sorting
        let brand = item.brand || '';
        const b = brand.trim().toLowerCase();
        if (b === 'schneider electric' || b === 'schneider') brand = 'Schneider Electric';
        else if (b === 'mercs') brand = 'MERCS';
        else if (b === 'nhp') brand = 'NHP';
        else if (b === 'ipd') brand = 'IPD';
        else brand = brand.trim();

        const brandOrder = POWER_METER_BRAND_ORDER[brand] || 99;
        parts.push(brandOrder);

        const partNum = (item.partNumber || item.name || '').trim().toUpperCase();

        if (brand === 'Schneider Electric') {
            const idx = SCHNEIDER_METER_ORDER.indexOf(partNum);
            parts.push(idx !== -1 ? idx : 999);
        } else if (brand === 'MERCS') {
            const idx = MERCS_METER_ORDER.indexOf(partNum);
            parts.push(idx !== -1 ? idx : 999);
        } else if (brand === 'NHP') {
            const idx = NHP_METER_ORDER.indexOf(partNum);
            parts.push(idx !== -1 ? idx : 999);
        } else if (brand === 'IPD') {
            const idx = IPD_METER_ORDER.indexOf(partNum);
            parts.push(idx !== -1 ? idx : 999);
        } else {
            parts.push(999);
        }
    } else {
        parts.push(0);
        parts.push(0);
    }

    // 5. Tie-Breakers
    const partNum = item.partNumber || item.name || '';
    parts.push(partNum);

    // 6. Name/Description Tie-Break
    const desc = item.description || '';
    parts.push(desc);

    return parts;
}


/**
 * Compare two items using the generated sort parts.
 * Usage: items.sort(compareItems);
 */
export function compareItems(a: SortableItem, b: SortableItem): number {
    const partsA = getSortParts(a);
    const partsB = getSortParts(b);

    const length = Math.min(partsA.length, partsB.length);

    for (let i = 0; i < length; i++) {
        const valA = partsA[i];
        const valB = partsB[i];

        if (valA === valB) continue;

        // Handle numeric comparison
        if (typeof valA === 'number' && typeof valB === 'number') {
            return valA - valB;
        }

        // Handle string comparison (lexicographical)
        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
        }

        // Mixed types? Should adhere to consistent schema, but failsafe:
        return String(valA).localeCompare(String(valB));
    }

    return partsA.length - partsB.length;
}
