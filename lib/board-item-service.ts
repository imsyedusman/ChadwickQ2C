
import prisma from './prisma';

export interface BoardConfig {
    ctMetering: string;
    ctType?: string;
    ctQuantity?: number;
    meterPanel: string;
    wholeCurrentMetering?: string;
    wcType?: string;
    wcQuantity?: number;
    tierCount?: number;
    enclosureType?: string;
    baseRequired?: string;
    location?: string;
    insulationLevel?: 'none' | 'air' | 'fully';
    [key: string]: any;
}

interface CatalogItem {
    partNumber: string | null;
    category: string | null;
    subcategory: string | null;
    description: string;
    unitPrice: number;
    labourHours: number;
}

const CT_BASE_ITEMS = [
    'CT-COMPARTMENTS',
    'CT-PANEL',
    'CT-TEST-BLOCK',
    'CT-WIRING'
];

const METER_PANEL_ITEMS = [
    '100A-PANEL',
    'CT-TEST-BLOCK',
    'CT-WIRING'
];

const WC_KIT_ITEMS = [
    '100A-FUSE',
    '100A-PANEL',
    '100A-NEUTRAL-LINK',
    '100A-MCB-1PH',
    '100A-MCB-3PH'
];

const BUSBAR_INSULATION_ITEM = 'Busbar Insulation';

// Tier items - source of truth for tier count
const TIER_ITEMS = ['1A-TIERS', '1B-TIERS-400'];

// MISC items that scale with tier count
const MISC_TIER_ITEMS = ['MISC-LABELS', 'MISC-HARDWARE', 'MISC-TEST-TIERS'];

// Delivery items - only one should exist at a time
const MISC_DELIVERY_ITEMS = ['MISC-DELIVERY-UTE', 'MISC-DELIVERY-HIAB'];

// Helper function to determine current band based on current rating
function getCurrentBand(currentRating: string): string {
    const amps = parseInt(currentRating.replace('A', ''));

    if (amps <= 400) return '400A';
    if (amps <= 630) return '630A';
    if (amps <= 800) return '800A';
    if (amps <= 1000) return '1000A';
    if (amps <= 1250) return '1250A';
    if (amps <= 1600) return '1600A';
    if (amps <= 2000) return '2000A';
    if (amps <= 2500) return '2500A';
    if (amps <= 3200) return '3200A';
    return '4000A';
}

// Helper function to get busbar part number based on current band and enclosure type
function getBusbarPartNumber(currentRating: string, enclosureType: string): string | null {
    const band = getCurrentBand(currentRating);

    if (enclosureType === 'Custom') {
        // Custom busbars: BB-400A, BB-630A, BB-800A, BB-1000A, BB-1250A, BB-1600A, BB-2000A, BB-2500A, BB-3000A
        const customMapping: Record<string, string> = {
            '400A': 'BB-400A',
            '630A': 'BB-630A',
            '800A': 'BB-800A',
            '1000A': 'BB-1000A',
            '1250A': 'BB-1250A',
            '1600A': 'BB-1600A',
            '2000A': 'BB-2000A',
            '2500A': 'BB-2500A',
            '3200A': 'BB-3000A',
            '4000A': 'BB-3000A'
        };
        return customMapping[band] || null;
    } else if (enclosureType === 'Cubic') {
        // Cubic busbars: BBC-400A-2, BBC-800A-2, BBC-1100A, BBC-1350A, BBC-1600A, BBC-1800A, BBC-2250A, BBC-2800A, BBC-3600A, BBC-4000A
        const cubicMapping: Record<string, string> = {
            '400A': 'BBC-400A-2',
            '630A': 'BBC-800A-2',
            '800A': 'BBC-800A-2',
            '1000A': 'BBC-1100A',
            '1250A': 'BBC-1350A',
            '1600A': 'BBC-1600A',
            '2000A': 'BBC-1800A',
            '2500A': 'BBC-2250A',
            '3200A': 'BBC-2800A',
            '4000A': 'BBC-4000A'
        };
        return cubicMapping[band] || null;
    }

    return null;
}

// Helper function to get CT chamber labour part number based on current band
function getLabourPartNumber(currentRating: string): string | null {
    const band = getCurrentBand(currentRating);

    // CT Labour items: CT-400A, CT-630A, CT-800A, CT-1200A, CT-1600A, CT-2000A, CT-2500A, CT-3200A
    const labourMapping: Record<string, string> = {
        '400A': 'CT-400A',
        '630A': 'CT-630A',
        '800A': 'CT-800A',
        '1000A': 'CT-1200A',
        '1250A': 'CT-1200A',
        '1600A': 'CT-1600A',
        '2000A': 'CT-2000A',
        '2500A': 'CT-2500A',
        '3200A': 'CT-3200A',
        '4000A': 'CT-3200A'
    };

    return labourMapping[band] || null;
}

// Items that contribute to the Stainless Steel Uplift calculation (S)
const SHEET_METAL_BASE_ITEMS = [
    '1B-TIERS-400',
    '1B-COMPARTMENTS',
    '1B-BASE',
    '1B-DOORS',
    '1B-600MM',
    '1B-800MM'
];

export async function syncBoardItems(boardId: string, config: BoardConfig, options?: { forceTiers?: boolean }) {
    console.log(`Syncing items for board ${boardId} with config:`, JSON.stringify(config, null, 2));

    // Fetch existing items to respect manual edits
    const existingItems = await prisma.item.findMany({
        where: { boardId }
    });

    // --- 1. DETERMINE TIER SOURCE OF TRUTH ---
    // Rule: if forceTiers (Wizard Save) -> Config is king.
    // If NOT forceTiers (Manual Edit) -> Existing Item quantity is king if present.
    // If neither -> Config or default.

    let tierCount = config.tierCount ?? 0;

    if (!options?.forceTiers) {
        // We are NOT forced by wizard config. Prioritize Manual Edit.
        const cubicTierItem = existingItems.find(i => i.name === '1A-TIERS');
        const customTierItem = existingItems.find(i => i.name === '1B-TIERS-400');

        if (config.enclosureType === 'Cubic' && cubicTierItem) {
            tierCount = cubicTierItem.quantity;
        } else if (config.enclosureType === 'Custom' && customTierItem) {
            tierCount = customTierItem.quantity;
        } else {
            // Fallback to whichever exists if enclosure type isn't strict match or switching
            if (cubicTierItem) tierCount = cubicTierItem.quantity;
            else if (customTierItem) tierCount = customTierItem.quantity;
        }
    }

    // Ensure tierCount doesn't go negative
    tierCount = Math.max(0, tierCount);

    console.log(`Effective Tier Count: ${tierCount} (Source: ${options?.forceTiers ? 'Config (Forced)' : 'Merged/Existing'})`);


    // --- 2. IDENTIFY TARGET ITEMS & QUANTITIES ---
    const targetItemPartNumbers = new Set<string>();
    const itemQuantities = new Map<string, number>();
    const customPricing = new Map<string, number>(); // Map<PartNumber, UnitPrice>
    const customLabour = new Map<string, number>(); // Map<PartNumber, LabourHours>

    const addTarget = (partNumber: string, qty: number, unitPrice?: number, labourHours?: number) => {
        targetItemPartNumbers.add(partNumber);
        // If item already exists in map, take max (logic specific) or just strict set
        // Here we strictly set what we want.
        itemQuantities.set(partNumber, qty);
        if (unitPrice !== undefined) {
            customPricing.set(partNumber, unitPrice);
        }
        if (labourHours !== undefined) {
            customLabour.set(partNumber, labourHours);
        }
    };

    // A. Enclosure & Tier Items
    // Visibility: These must appear in Basics. handled in DB Create/Update step.
    if (tierCount > 0) {
        if (config.enclosureType === 'Cubic') {
            addTarget('1A-TIERS', tierCount);
        } else {
            // Default to Custom logic
            addTarget('1B-TIERS-400', tierCount);
        }
    }

    // B. Misc Items (depend on Tier Count)
    if (tierCount > 0) {
        addTarget('MISC-LABELS', tierCount);
        addTarget('MISC-HARDWARE', tierCount);
        addTarget('MISC-TEST-TIERS', tierCount);

        if (tierCount === 1) {
            addTarget('MISC-DELIVERY-UTE', 1);
        } else {
            addTarget('MISC-DELIVERY-HIAB', 1);
        }
    }

    // D. Base Logic (Custom Only)
    // Applies if Enclosure != Cubic AND BaseRequired = Yes AND TierCount > 0
    if (config.enclosureType !== 'Cubic' && config.baseRequired === 'Yes' && tierCount > 0) {
        const totalBaseCost = 200 + (tierCount * 200);
        // Logic: Qty = TierCount, UnitPrice = Total / Qty
        const unitPrice = totalBaseCost / tierCount;

        console.log(`Base Calculation: Tiers=${tierCount}, Total=${totalBaseCost}, Unit=${unitPrice}`);
        addTarget('1B-BASE', tierCount, unitPrice);
    }

    // New 2025-12-10: 1B-DOORS for Outdoor Custom boards
    // Rule: Custom + Outdoor + Tiers > 0 -> Add 1B-DOORS (Qty = TierCount)
    // Used for "Extra for Doors Over (Yes = 1)"
    if (config.enclosureType === 'Custom' && config.location === 'Outdoor' && tierCount > 0) {
        addTarget('1B-DOORS', tierCount);
    }

    // D. CT Metering
    const ctQty = config.ctQuantity || 1;
    if (config.ctMetering === 'Yes') {
        CT_BASE_ITEMS.forEach(pn => addTarget(pn, ctQty));
        if (config.ctType) addTarget(`CT-${config.ctType}-TYPE`, ctQty);

        if (config.currentRating && config.enclosureType) {
            const busbar = getBusbarPartNumber(config.currentRating, config.enclosureType);
            if (busbar) addTarget(busbar, ctQty);
        }
        if (config.currentRating) {
            const labour = getLabourPartNumber(config.currentRating);
            if (labour) addTarget(labour, ctQty);
        }
    }

    // E. Meter Panel
    if (config.meterPanel === 'Yes') {
        METER_PANEL_ITEMS.forEach(pn => addTarget(pn, ctQty));
    }

    // F. Whole Current
    if (config.wholeCurrentMetering === 'Yes') {
        const wcQty = config.wcQuantity || 1;
        if (config.wcType === '100A wiring 3-phase') {
            addTarget('100A-FUSE', wcQty * 3);
            addTarget('100A-PANEL', wcQty);
            addTarget('100A-NEUTRAL-LINK', wcQty);
            addTarget('100A-MCB-3PH', wcQty);
        } else if (config.wcType === '100A wiring 1-phase') {
            addTarget('100A-FUSE', wcQty);
            addTarget('100A-PANEL', wcQty);
            addTarget('100A-NEUTRAL-LINK', wcQty);
            addTarget('100A-MCB-1PH', wcQty);
        }
    }

    // --- 3. STAINLESS UPLIFT CALCULATION ---
    // Zero-Tier Check: If tierCount == 0, we don't do uplift (Misc/Base/Tiers are gone).
    // Technically compartments/doors might exist, but usually Custom board implies tiers.
    // Requirement: "If tiers go to 0... Stainless uplift should be removed"

    if (tierCount > 0 && config.enclosureType === 'Custom' &&
        (config.material === 'Powder 316 Stainless Steel' || config.material === '316 Stainless Steel Natural Finish')) {

        // Calculate S = Sum of material costs for Sheet Metal Base Items
        let S = 0;

        for (const itemPn of SHEET_METAL_BASE_ITEMS) {
            // Priority:
            // 1. Is it a target we just defined with a custom price? (e.g. 1B-BASE)
            // 2. Is it in existingItems (manual or previously synced)?
            // 3. (Catalog lookup is hard here without fetching, but we assume these items exist if they matter)

            let itemCost = 0;
            const targetPrice = customPricing.get(itemPn);
            const targetQty = itemQuantities.get(itemPn);
            const existing = existingItems.find(i => i.name === itemPn);

            if (targetPrice !== undefined && targetQty !== undefined) {
                // We are setting this price specifically (e.g. 1B-BASE)
                itemCost = targetPrice * targetQty;
            } else if (existing) {
                // Use existing item cost (respect manual edits)
                // If item IS in our target list (e.g. 1B-TIERS-400), we expect to use the TARGET Qty * Existing Price
                // UNLESS we have a target Price.

                const qtyToUse = targetItemPartNumbers.has(itemPn) && itemQuantities.has(itemPn)
                    ? itemQuantities.get(itemPn)!
                    : existing.quantity;

                itemCost = existing.unitPrice * qtyToUse;
            }
            S += itemCost;
        }

        // Apply Factor
        const factor = config.material === 'Powder 316 Stainless Steel' ? 0.65 : 0.75;
        const upliftCost = S * factor;
        const upliftItemName = config.material === 'Powder 316 Stainless Steel' ? '1B-SS-2B' : '1B-SS-NO4';

        console.log(`Stainless Uplift: S=${S}, Factor=${factor}, Item=${upliftItemName}, Cost=${upliftCost}`);

        addTarget(upliftItemName, 1, upliftCost);
    }


    // --- 3.5 PREPARE CATALOG MAP (Needed for Busbar Logic & DB Ops) ---
    const targetPartNumbersArray = Array.from(targetItemPartNumbers);

    // Fetch catalog info for all targets (to get descriptions, defaults, and prices for non-customized items)
    const catalogItems = await prisma.catalogItem.findMany({
        where: { partNumber: { in: targetPartNumbersArray } }
    });
    const catalogMap = new Map<string, CatalogItem>();
    catalogItems.forEach((i: any) => { if (i.partNumber) catalogMap.set(i.partNumber, i); });


    // --- 4. BUSBAR INSULATION ---
    // Rule: One item "Busbar Insulation".
    // Cost = (Total Busbar Material * Factor * 0.4)
    // Labour = (Total Busbar Labour * Factor * 0.6)
    // Factor: Air=0.25 (Default), Fully=1.0. None=0 (remove item).

    // Default to 'air' as per requirement
    const insulationLevel = config.insulationLevel?.toLowerCase() || 'air';
    const hasInsulation = insulationLevel === 'air' || insulationLevel === 'fully';
    const insulationFactor = insulationLevel === 'fully' ? 1.0 : (insulationLevel === 'air' ? 0.25 : 0);

    // Identify Busbars on this board
    // We must look at the EFFECTIVE list of items (Existing items + New Targets).
    // Note: We do NOT fetch the catalog for this. We use what is on the board.

    const effectiveBusbarItems = new Map<string, { qty: number, price: number, labour: number, category: string }>();

    // 1. Process Existing Items first
    existingItems.forEach(item => {
        // Skip if this item is being removed (it's not in targets and is managed/default)
        // Actually, the removal logic happens later (Step 5A). We need to simulate it here.
        // A simple heuristic: If it's a "Managed Item" (like auto-added tier items), it MIGHT be removed if not in targets.
        // BUT Busbars are usually user-added or auto-added.
        // Let's rely on: If it's in existing items, count it, UNLESS it's strictly a target that we know we are setting to 0 (unlikely for busbars).

        // Critical: Don't count "Busbar Insulation" itself to avoid recursion/loops
        if (item.name === BUSBAR_INSULATION_ITEM) return;

        // Check isBusbar
        // Rule: Category "Busbar" OR (Fallback) Name starts with BB-/BBC-
        const isBusbar = (item.category?.toUpperCase() === 'BUSBAR') ||
            (item.name.startsWith('BB-') || item.name.startsWith('BBC-'));

        if (isBusbar) {
            effectiveBusbarItems.set(item.name, {
                qty: item.quantity,
                price: item.unitPrice,
                labour: item.labourHours,
                category: item.category
            });
        }
    });

    // 2. Process Targets (Overrides existing)
    targetItemPartNumbers.forEach(pn => {
        if (pn === BUSBAR_INSULATION_ITEM) return;

        const qty = itemQuantities.get(pn) || 0;

        // If target logic set qty to 0, remove it from effective list
        if (qty <= 0) {
            effectiveBusbarItems.delete(pn);
            return;
        }

        // Check if this target is a busbar
        // We might not have category for a pure target if it's new.
        // We can inspect the existing item (if any) or look at the name pattern.
        // In this specific flow, targets are usually things `syncBoardItems` controls (Tiers, Misc, etc.)
        // Busbars are rarely "Targets" unless we add auto-busbars later.
        // IF we have auto-busbars, they will be here.

        // For now, let's blindly check name pattern if we don't have category context,
        // OR check if we have it in our set.
        let isBusbar = false;
        let category = 'Basics'; // Default for targets if unknown

        // Try to find category from existing
        const existing = existingItems.find(i => i.name === pn);
        if (existing) category = existing.category;

        if (category?.toUpperCase() === 'BUSBAR' || pn.startsWith('BB-') || pn.startsWith('BBC-')) {
            isBusbar = true;
        }

        if (isBusbar) {
            // Price/Labour?
            // If customPricing has it, use it. Else use existing. Price defaults to 0 if neither (will get fixed in DB step but for calc we use 0)
            const price = customPricing.get(pn) ?? (existing?.unitPrice || 0);
            const labour = customLabour.get(pn) ?? (existing?.labourHours || 0);

            effectiveBusbarItems.set(pn, {
                qty,
                price,
                labour,
                category
            });
        }
    });

    // 3. Calculate Totals
    let totalBusbarMaterial = 0;
    let totalBusbarLabour = 0;

    effectiveBusbarItems.forEach((val) => {
        totalBusbarMaterial += (val.price * val.qty);
        totalBusbarLabour += (val.labour * val.qty);
    });

    // 4. Apply Factor & Create Insulation Item
    // Requirement: Factor=0 OR Totals=0 -> Remove Item (Don't addTarget)
    if (insulationFactor > 0 && (totalBusbarMaterial > 0 || totalBusbarLabour > 0)) {
        // Excel Logic:
        // ExtraLabourHours = SUM(G:G) * Factor * 0.6
        // ExtraMaterialCost = SUM(H:H) * Factor * 0.4
        const extraMaterial = totalBusbarMaterial * insulationFactor * 0.4;
        const extraLabour = totalBusbarLabour * insulationFactor * 0.6;

        addTarget(BUSBAR_INSULATION_ITEM, 1, extraMaterial, extraLabour);
    }


    // --- 5. EXECUTE DB OPERATIONS ---


    // A. Remove Items
    // Remove items that are isDefault=true AND in our "Managed Lists" but NOT in current targets
    // Managed lists = arrays of potential auto-items
    const allManagedItems = [
        ...CT_BASE_ITEMS,
        ...METER_PANEL_ITEMS,
        ...WC_KIT_ITEMS,
        'CT-S-TYPE', 'CT-T-TYPE', 'CT-W-TYPE', 'CT-U-TYPE',
        ...MISC_TIER_ITEMS,
        ...MISC_DELIVERY_ITEMS,
        ...TIER_ITEMS,
        '1B-BASE',
        '1B-DOORS',
        '1B-SS-2B', '1B-SS-NO4',
        BUSBAR_INSULATION_ITEM
    ];

    // Also add Busbars/Labour patterns to removal check
    const isManagedPattern = (name: string) =>
        name.startsWith('BB-') || name.startsWith('BBC-') || (name.startsWith('CT-') && name.endsWith('A'));

    const itemsToRemove = existingItems.filter(item =>
        item.isDefault &&
        (allManagedItems.includes(item.name) || isManagedPattern(item.name)) &&
        !targetItemPartNumbers.has(item.name)
    );

    if (itemsToRemove.length > 0) {
        await prisma.item.deleteMany({
            where: { id: { in: itemsToRemove.map(i => i.id) } }
        });
    }

    // B. Add / Update Items
    // Optimization: Use Promise.all for parallel execution to reduce lag
    // CRITICAL FIX: Re-generate array from Set because BUSBAR_INSULATION_ITEM was added AFTER the initial array creation.
    const finalTargetPartNumbers = Array.from(targetItemPartNumbers);

    await Promise.all(finalTargetPartNumbers.map(async (partNumber) => {
        const targetQty = itemQuantities.get(partNumber) || 1;
        const targetPrice = customPricing.get(partNumber); // undefined if not custom
        const targetLabour = customLabour.get(partNumber);

        const existingItem = existingItems.find(i => i.name === partNumber && i.isDefault);
        const catalogItem = catalogMap.get(partNumber);

        if (!existingItem && !catalogItem && !customPricing.has(partNumber)) {
            // It's possible for valid items (e.g. Busbar Insulation) to be purely dynamic with no catalog entry
            // but we must have pushed them via addTarget.
            console.warn(`Skipping ${partNumber}: No catalog item found and not existing/custom.`);
            return;
        }

        // Visibility Logic: Force Bascis category for these critical items
        const isCoreItem = ['1A-TIERS', '1B-TIERS-400', '1B-BASE', '1B-SS-2B', '1B-SS-NO4'].includes(partNumber);
        const isBusbarInsulation = partNumber === BUSBAR_INSULATION_ITEM;
        const forcedCategory = isBusbarInsulation ? 'Busbar' : (isCoreItem ? 'Basics' : undefined);

        if (isBusbarInsulation) {
            console.log(`[BusbarInsulation] Processing item: ${partNumber}. Force Cat: ${forcedCategory}. Target Qty: ${targetQty}. Target Price: ${targetPrice}`);
        }

        if (existingItem) {
            // Update logic
            const newUnitPrice = targetPrice !== undefined ? targetPrice : existingItem.unitPrice;
            const newLabour = targetLabour !== undefined ? targetLabour : existingItem.labourHours;
            const newQty = targetQty; // We enforce quantity for auto-items

            // Only update if changes needed
            if (existingItem.quantity !== newQty ||
                (Math.abs(existingItem.unitPrice - newUnitPrice) > 0.01) ||
                (Math.abs(existingItem.labourHours - newLabour) > 0.01) ||
                (forcedCategory && existingItem.category !== forcedCategory)) {

                await prisma.item.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: newQty,
                        unitPrice: newUnitPrice,
                        labourHours: newLabour,
                        cost: newUnitPrice * newQty,
                        category: forcedCategory || existingItem.category // Enforce basics/busbar if needed
                    }
                });
            }
        } else {
            // Create new
            // Catalog item might be undefined for dynamic items!
            const catItem = catalogItem || {
                category: 'Switchboard',
                subcategory: '',
                description: partNumber,
                unitPrice: 0,
                labourHours: 0
            };

            const unitPrice = targetPrice !== undefined ? targetPrice : catItem.unitPrice;
            const labourHours = targetLabour !== undefined ? targetLabour : catItem.labourHours;

            await prisma.item.create({
                data: {
                    boardId,
                    category: forcedCategory || catItem.category || 'Basics',
                    subcategory: catItem.subcategory,
                    name: catalogItem?.partNumber || partNumber,
                    description: catItem.description,
                    unitPrice: unitPrice,
                    labourHours: labourHours,
                    quantity: targetQty,
                    cost: unitPrice * targetQty,
                    isDefault: true
                }
            });
        }
    }));
}
