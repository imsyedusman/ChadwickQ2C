export interface CatalogDetails {
    brand: string;
    category: string;
    subcategory: string;
    meterType: string | null;
}

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
        // Try to detect from data if not manually overridden
        // For Schneider file, it's usually Schneider Electric if manualBrand isn't set.
        // But if it's a generic vendor file, we might not have a reliable column unless we parse desc.
        // The current generic import defaults to 'Schneider Electric' if manualBrand is empty in CatalogManager.
        // We will respect that default in CatalogManager, but here we can refine if needed.
        if (part.startsWith('A9') || part.startsWith('C10') || part.startsWith('LV4')) {
            brand = 'Schneider Electric';
        }
        // Add more brand detection rules here if needed
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
    let subcategory = cats.filter(c => c).join(' > ');

    // Normalize Subcategory for Power Meters
    if (isPowerMeter) {
        subcategory = 'Power Meters';
    }
    // Legacy mapping mapLegacyCategory logic could be moved here too
    else if (subcategory.includes('Miscellaneous > Metering > Power Meter Accessories')) {
        subcategory = 'Power Meter Accessories';
    }

    return {
        brand,
        category: masterCategory,
        subcategory,
        meterType
    };
}
