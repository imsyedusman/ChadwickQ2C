import prisma from '@/lib/prisma';

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

export async function searchCatalog(params: { query?: string; brand?: string; category?: string }) {
    const { query, brand, category } = params;
    const search = query?.trim() || '';
    
    const take = 20;

    // Build base filters (brand, category)
    const baseWhere: any = {};
    if (brand) {
        baseWhere.brand = brand;
    }
    if (category) {
        if (category.toLowerCase() === 'switchboard') {
            baseWhere.OR = [
                { brand: 'Schneider Electric' },
                { brand: { not: null, notIn: ['Schneider Electric'] } }
            ];
        } else {
            baseWhere.category = category;
        }
    }

    if (search) {
        // 1. Exact Match / Prefix Query (High Priority)
        const exactMatches = await prisma.catalogItem.findMany({
            where: {
                ...baseWhere,
                partNumber: { equals: search, mode: 'insensitive' }
            },
            take: 50
        });

        // 2. Broad Query (Contains)
        // Construct where for broad query to avoid overriding the OR condition from category
        const broadWhere = { ...baseWhere };
        if (baseWhere.OR) {
            broadWhere.AND = [{ OR: baseWhere.OR }];
            delete broadWhere.OR;
        }

        const broadMatches = await prisma.catalogItem.findMany({
            where: {
                ...broadWhere,
                OR: [
                    { partNumber: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { subcategory: { contains: search, mode: 'insensitive' } },
                    { category: { contains: search, mode: 'insensitive' } }
                ]
            },
            take: take
        });

        // Merge and Deduplicate
        const allDocs = [...exactMatches, ...broadMatches];
        const uniqueDocs = Array.from(new Map(allDocs.map(item => [item.id, item])).values());

        // Rank Results
        const rankedDocs = uniqueDocs.map(item => {
            let score = 0;
            const partNo = (item.partNumber || '').toUpperCase();
            const q = search.toUpperCase();

            if (partNo === q) {
                score = 100; // Exact Part Number
            } else if (partNo.startsWith(q)) {
                score = 80; // Prefix Part Number
            } else if (partNo.includes(q)) {
                score = 60; // Contains Part Number
            } else if ((item.description || '').toUpperCase().includes(q)) {
                score = 40; // Description
            } else {
                score = 20; // Category/Subcategory
            }

            return { item, score };
        });

        // Sort by Score DESC, then PartNumber ASC, then ID ASC
        rankedDocs.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            // Tie-breaker: Part Number
            const pA = (a.item.partNumber || '').toUpperCase();
            const pB = (b.item.partNumber || '').toUpperCase();
            if (pA < pB) return -1;
            if (pA > pB) return 1;
            return 0; // Stable
        });

        return rankedDocs.map(r => r.item).slice(0, take);
    }

    // Non-Search Filtering (if no search query provided)
    const items = await prisma.catalogItem.findMany({
        where: baseWhere,
        take: take,
        orderBy: { brand: 'asc' },
    });

    return items;
}
