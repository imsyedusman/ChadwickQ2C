/**
 * Centralized Categorization Rules for Item Reclassification
 * 
 * Rules for mapping items to different "Cost Categories" (buckets) for:
 * 1. Composition Details
 * 2. Board composition strip
 * 3. PDF BOM Exports
 * 4. Board Comparisons
 * 
 * This ensures that specialized items like "Cleats" are correctly grouped as "Basics" 
 * for labour and material costing, even if they reside under "Busbar" in the selection UI.
 */

export interface MinimalItem {
    category: string;
    subcategory?: string | null;
    name?: string;
    description?: string | null;
    isSystemManaged?: boolean;
    systemTag?: string | null;
    partNumber?: string | null;
}

/**
 * Standard Cost Category Labels
 */
export const COST_CATEGORIES = {
    BASICS: 'Basics / Enclosure',
    BUSBARS: 'Busbars',
    BUSBAR_INSULATION: 'Busbar Insulation',
    CIRCUIT_BREAKERS: 'Circuit Breakers',
    ISOLATORS: 'Isolators & Switches',
    MISCELLANEOUS: 'Miscellaneous',
    CT_METERING: 'CT Metering (System)',
    OTHER: 'Other'
} as const;

/**
 * Resolves the "Cost Category" for an item based on reclassification rules.
 * This is the ONLY source of truth for composition grouping.
 */
export function resolveCostCategory(item: MinimalItem): string {
    const cat = (item.category || '').toLowerCase();
    const subcat = (item.subcategory || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    
    const subcatContains = (term: string) => subcat.includes(term.toLowerCase());

    // 1. Cleats Reclassification (Required for Custom Boards Only)
    // Using "Busbar Supports" as the identifier for robustness
    if (subcatContains("busbar supports") || desc.includes("cleats") || name.startsWith("1B1-CLEAT")) {
        return COST_CATEGORIES.BASICS;
    }

    // 2. Busbar Insulation
    if (cat === 'busbar' && (subcatContains('insulation') || name.includes('insulation'))) {
        return COST_CATEGORIES.BUSBAR_INSULATION;
    }

    // 3. Main Busbars
    if (cat === 'busbar') {
        return COST_CATEGORIES.BUSBARS;
    }

    // 4. Circuit Breakers
    if (cat === 'switchboard' && (
        subcatContains('circuit breaker') ||
        subcatContains('mccb') ||
        subcatContains('mcb') ||
        subcatContains('acb') ||
        subcatContains('trip unit')
    )) {
        return COST_CATEGORIES.CIRCUIT_BREAKERS;
    }

    // 5. Isolators & Switches
    if (cat === 'switchboard' && (subcatContains('switch') || subcatContains('isolator'))) {
        return COST_CATEGORIES.ISOLATORS;
    }

    // 6. Miscellaneous Grouping
    if (cat === 'switchboard' && (
        subcatContains('meter') ||
        subcatContains('fuse') ||
        subcatContains('current transformer') ||
        subcatContains('wiring') ||
        subcatContains('surge') ||
        subcatContains('miscellaneous') ||
        item.systemTag === 'CT_METERING'
    )) {
        return COST_CATEGORIES.MISCELLANEOUS;
    }

    // 7. CT Metering (System Managed fallback)
    if (item.isSystemManaged && (item.systemTag === 'CT_METERING' || subcatContains('ct metering'))) {
        return COST_CATEGORIES.CT_METERING;
    }

    // 8. Basics Standard Mapping
    if (cat === 'basics') {
        return COST_CATEGORIES.BASICS;
    }

    return COST_CATEGORIES.OTHER;
}

/**
 * Helper to identify if an item is a Cleat (Busbar Support)
 */
export function isCleatItem(item: MinimalItem): boolean {
    const subcat = (item.subcategory || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    return subcat.includes("busbar supports") || desc.includes("cleats") || name.startsWith("1B1-CLEAT");
}
