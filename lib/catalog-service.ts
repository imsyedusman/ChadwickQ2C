export interface CatalogDetails {
    brand: string;
    category: string;
    subcategory: string;
    meterType: string | null;
    isCopperPriced?: boolean;
    totalCopperWeightKgPerMeter?: number | null;
}

// EXACT Mapping: Part Number -> Total Copper Weight (kg/m)
const COPPER_WEIGHTS: Record<string, number> = {
    // Custom Busbars (BB-)
    "BB-3000A": 112,
    "BB-2500A": 87.5,
    "BB-2000A": 70,
    "BB-1600A": 46,
    "BB-1250A": 35,
    "BB-1000A": 22.5,
    "BB-800A": 18,
    "BB-630A": 11,
    "BB-400A": 7,

    // Cubic Busbars (BBC-)
    "BBC-3600A": 105,
    "BBC-2800A": 70,
    "BBC-2250A": 56,
    "BBC-1800A": 42,
    "BBC-1600A": 35,
    "BBC-1350A": 28,
    "BBC-1100A": 21,
    "BBC-800A-2": 14,
    "BBC-400A-2": 7,

    // MCCB Tee Off Bars
    "MCCB-250A": 3,
    "MCCB-400A": 4,
    "MCCB-630A": 8,
    "MCCB-800A": 14,
    "MCCB-1000A": 18,
    "MCCB-1250A": 26,
    "MCCB-1600A": 36
};

/**
 * Heuristics to determine Brand, Category, Subcategory, and Meter Type
 * from raw catalog data (Schneider or Missing Vendor Catalog).
 */
export function classifyCatalogItem(
    description: string,
    partNumber: string,
    vendorCategory1: string,
    vendorCategory2: string,
    vendorCategory3: string,
    manualBrand: string
): CatalogDetails {
    const desc = description.toLowerCase();
    const part = partNumber.toUpperCase();
    const cats = [vendorCategory1, vendorCategory2, vendorCategory3].map(c => c ? c.toString().trim() : '');
    const combinedCats = cats.join(' > ').toLowerCase();

    // 1. Determine Brand
    let brand = manualBrand || 'Unknown';
    if (!manualBrand) {
        // Comprehensive Schneider Electric Prefix List
        const schneiderPrefixes = [
            'A9', 'C10', 'LV4', 'LV5', 'MGU', 'NSY', 'METSE', 
            'XB4', 'XB5', 'GV2', 'GV3', 'LC1', 'LC2', 'ATS', 
            'ATV', 'VCF', 'ZB4', 'ZB5', 'RSL', 'RXM', 'ZBE', 
            'XAL', 'LU', 'VW3', 'CCT', 'M9', 'RM17', 'PBEL'
        ];

        if (schneiderPrefixes.some(p => part.startsWith(p)) || desc.includes('schneider electric')) {
            brand = 'Schneider Electric';
        }
        
        // Fallback: If it's a known Schneider-only feature context, default to Schneider
        // We only do this if it's still 'Unknown' after all checks.
        if (brand === 'Unknown') {
            brand = 'Schneider Electric';
        }
    }

    // 2. Determine Meter Type (Direct, CT, NMI)
    let meterType: string | null = null;
    let isPowerMeter = false;

    // Is it a Power Meter?
    // Check Legacy Mappings first or Keywords
    if (combinedCats.includes('power meter') ||
        combinedCats.includes('metering') ||
        desc.includes('power meter') ||
        desc.includes('energy meter') ||
        desc.includes('kilowatt hour meter')) {
        isPowerMeter = true;
    }

    if (isPowerMeter) {
        // Classification Logic
        if (desc.includes('direct') || desc.includes('whole current') || desc.includes('din rail') || desc.includes('63a') || desc.includes('100a')) {
            meterType = 'Direct';
        } else if (desc.includes('ct connected') || desc.includes('current transformer connected') || desc.includes('measuring instrument')) {
            meterType = 'CT';
        } else if (desc.includes('nmi') || desc.includes('pattern approved') || part.startsWith('METSEPM5')) {
            meterType = 'NMI'; // Or 'NMI / Special'
        } else {
            // Fallback for meters
            meterType = 'Special';
        }
    }

    // 3. Determine Final Category/Subcategory
    let masterCategory = 'Switchboard'; // Default Master
    
    // Preserve specialized categories if they are passed in (e.g. from manual entry or specific loaders)
    const existingCat = vendorCategory1 || '';
    if (['Basics', 'Busbar'].includes(existingCat)) {
        masterCategory = existingCat;
    }

    let subcategory = cats.filter(c => c).join(' > ');

    // Normalize Subcategory for Power Meters
    if (isPowerMeter) {
        subcategory = 'Power Metering';
    }
    // Legacy mapping mapLegacyCategory logic could be moved here too
    else if (subcategory.includes('Miscellaneous > Metering > Power Meter Accessories')) {
        subcategory = 'Power Meter Accessories';
    }

    // Standardize Switchboard Hierarchy: Prepend "Miscellaneous > " if not a primary category
    if (masterCategory === 'Switchboard') {
        const L1_TARGETS = ['Circuit Breakers', 'Switches', 'Miscellaneous'];
        let parts = subcategory.split(' > ').map(s => s.trim()).filter(Boolean);
        
        if (parts.length > 0 && !L1_TARGETS.includes(parts[0])) {
            // It belongs under Miscellaneous
            parts = ['Miscellaneous', ...parts];
        }

        // Nested Accessories for Circuit Breakers
        if (parts[0] === 'Circuit Breakers') {
            const cbAccessoryMappings: Record<string, string[]> = {
                'ACB Accessories': ['ACB', 'ACB Accessories'],
                'ATS Accessories': ['ATS', 'ATS Accessories'],
                'MCB Accessories': ['MCB', 'MCB Accessories']
            };

            const l2 = parts[1];
            if (cbAccessoryMappings[l2]) {
                parts.splice(1, 1, ...cbAccessoryMappings[l2]);
            } else if (l2 === 'ATS' && parts[2] === 'Accessories') {
                parts[2] = 'ATS Accessories';
            } else if (l2 === 'MCB' && parts[2] === 'Accessories') {
                parts[2] = 'MCB Accessories';
            }
        }

        subcategory = parts.join(' > ');
    }

    // 4. Determine Pricing Metadata (Copper)
    let isCopperPriced = false;
    let totalCopperWeightKgPerMeter: number | null = null;

    if (masterCategory === 'Busbar' && COPPER_WEIGHTS[part]) {
        isCopperPriced = true;
        totalCopperWeightKgPerMeter = COPPER_WEIGHTS[part];
    }

    return {
        brand,
        category: masterCategory,
        subcategory,
        meterType,
        isCopperPriced,
        totalCopperWeightKgPerMeter
    };
}
