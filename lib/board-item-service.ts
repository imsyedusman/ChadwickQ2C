
import prisma from '@/lib/prisma';
import { Item, CatalogItem as PrismaCatalogItem } from '@prisma/client';

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
    enclosureDepth?: string; // '400', '600', '800'
    totalCompartments?: number;
    isOver50kA?: string; // 'Yes' | 'No'
    isNonStandardColour?: string; // 'Yes' | 'No'
    baseRequired?: string;
    location?: string;
    insulationLevel?: 'none' | 'air' | 'fully';
    boardWidth?: number; // Millimetres
    shippingSections?: number; // Integer, min 1
    cableZones?: string; // 'Yes' | 'No'
    cableZoneCount?: number;
    includesAcbs?: string; // 'Yes' | 'No'
    [key: string]: any;
}

interface CatalogItem {
    partNumber: string | null;
    category: string | null;
    subcategory: string | null;
    description: string;
    unitPrice: number;
    labourHours: number;
    isSheetmetal?: boolean;
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

const CUBIC_OPTIONS_ITEMS = [
    '1A-COMPARTMENTS',
    '1A-50KA',
    '1A-COLOUR'
];

function getCleatType(currentRating: number): string | null {
    if (currentRating <= 400) return '1B1-CLEAT-SMALL-1';
    if (currentRating <= 1000) return '1B1-CLEAT-SMALL-2';
    if (currentRating <= 1600) return '1B1-CLEAT-LARGE-2';
    return '1B1-CLEAT-LARGE-3';
}

export async function syncBoardItems(boardId: string, config: BoardConfig, options?: { forceTiers?: boolean }) {
    console.log(`Syncing items for board ${boardId} with config:`, JSON.stringify(config, null, 2));

    // Fetch existing items to respect manual edits
    // Also fetch Quote settings for overrides
    const boardData = await prisma.board.findUnique({
        where: { id: boardId },
        include: { items: true, quote: true }
    });

    if (!boardData) return;

    const existingItems = boardData.items;

    // Parse Settings/Overrides
    let cleatOverrides: Record<string, number> = {};
    if (boardData.quote?.settingsSnapshot) {
        try {
            const settings = JSON.parse(boardData.quote.settingsSnapshot);
            if (settings.cleatOverrides && settings.cleatOverrides[boardId]) {
                cleatOverrides = settings.cleatOverrides[boardId];
            }
        } catch (e) {
            console.warn('Failed to parse quote settings', e);
        }
    }

    // --- 1. DETERMINE TIER SOURCE OF TRUTH ---
    // Rule: if forceTiers (Wizard Save) -> Config is king.
    // If NOT forceTiers (Manual Edit) -> Existing Item quantity is king if present.
    // If neither -> Config or default.

    let tierCount = config.tierCount ?? 0;

    if (!options?.forceTiers) {
        // We are NOT forced by wizard config. Prioritize Manual Edit.
        const cubicTierItem = existingItems.find((i: Item) => i.name === '1A-TIERS');
        const customTierItem = existingItems.find((i: Item) => i.name === '1B-TIERS-400');

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
            // Dynamic Pricing for 1B-TIERS-400
            // Rule: 1 Tier = $1800, >1 Tier = $1400 each
            const tierPrice = tierCount === 1 ? 1800 : 1400;
            addTarget('1B-TIERS-400', tierCount, tierPrice);
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

    // E. Custom Enclosure Extras (Doors & Depth)
    // Applies to all Custom boards with tiers > 0
    if (config.enclosureType === 'Custom' && tierCount > 0) {

        // 1. Outdoor Doors (Strictly Outdoor)
        if (config.location === 'Outdoor') {
            addTarget('1B-DOORS', tierCount);
        }

        // 2. Depth Logic (All Custom Boards - Indoor & Outdoor)
        // Rule: If 600mm -> 1B-600MM @ $500/tier
        //       If 800mm -> 1B-800MM @ $1000/tier
        //       If 400mm (Standard) -> None
        const depth = config.enclosureDepth || '400';
        if (depth === '600') {
            addTarget('1B-600MM', tierCount, 500);
        } else if (depth === '800') {
            addTarget('1B-800MM', tierCount, 1000);
        }
    }

    // New 2025-12-23: Cable Zones
    // Rule: If Cable Zones = Yes, add MISC-CABLE-TRAY * Count
    if (config.cableZones === 'Yes' && (config.cableZoneCount || 0) > 0) {
        addTarget('MISC-CABLE-TRAY', config.cableZoneCount || 1);
    }

    // --- METERING LOGIC ---
    // Refactored 2026-01-23 to enforce strict CT Mode & Mutual Exclusivity

    // 1. Centralize CT Mode Decision
    // Rule: CT Mode = (ctMetering === "Yes") OR (currentRating > 100)
    // Note: ctMetering check is strictly case-insensitive "yes". Blanks/Undefined/No are FALSE.

    const amps = parseInt((config.currentRating || '0').replace(/[^0-9]/g, '')) || 0;
    const ctMeteringStrict = (config.ctMetering || '').toLowerCase() === 'yes';
    const isOver100A = amps > 100;

    const isCtMode = ctMeteringStrict || isOver100A;

    // DEBUG LOGGING
    console.log('--- CT DEBUG ---');
    console.log(`Config CT Metering: "${config.ctMetering}"`);
    console.log(`Config Current Rating: "${config.currentRating}"`);
    console.log(`Parsed Amps: ${amps}`);
    console.log(`Is Over 100A: ${isOver100A}`);
    console.log(`CT Strict (Yes?): ${ctMeteringStrict}`);
    console.log(`FINAL CT MODE: ${isCtMode}`);
    console.log('----------------');

    const ctQty = config.ctQuantity || 1;
    const meterPanelSelected = config.meterPanel === 'Yes';

    // 2. APPLY LOGIC

    // D. CT Metering (SACT)
    if (isCtMode) {
        // Add CT Base Items strictly
        CT_BASE_ITEMS.forEach(pn => addTarget(pn, ctQty));

        if (config.ctType) addTarget(`CT-${config.ctType}-TYPE`, ctQty);

        if (config.currentRating && config.enclosureType) {
            const busbarPartNumber = getBusbarPartNumber(config.currentRating, config.enclosureType);
            if (busbarPartNumber) {
                // Fix 2026-01-23: Respect user-edited quantity for busbars.
                // Auto-add with default 1 only if it doesn't exist.
                // If it exists, use its current quantity to prevent sync from reverting edits.
                const existingBusbar = existingItems.find((i: Item) => i.name === busbarPartNumber);
                const busbarQty = existingBusbar ? existingBusbar.quantity : 1;
                addTarget(busbarPartNumber, busbarQty);
            }
        }
        if (config.currentRating) {
            const labour = getLabourPartNumber(config.currentRating);
            if (labour) addTarget(labour, ctQty);
        }
    }

    // E. Whole Current Metering
    // Only if NOT in CT Mode AND Amps <= 100 (Implicit by !isCtMode definition above)
    // Wait, isCtMode definition covers amps > 100. So !isCtMode implies amps <= 100 AND ctMetering != Yes.
    // So checking !isCtMode is sufficient for mutual exclusivity.

    if (!isCtMode && config.wholeCurrentMetering === 'Yes') {
        const wcQty = config.wcQuantity || 1;

        // Add 100A Meter Panel & Kit items
        addTarget('100A-PANEL', wcQty);

        if (config.wcType === '100A wiring 3-phase') {
            addTarget('100A-FUSE', wcQty * 3);
            addTarget('100A-NEUTRAL-LINK', wcQty);
            addTarget('100A-MCB-3PH', wcQty);
        } else if (config.wcType === '100A wiring 1-phase') {
            addTarget('100A-FUSE', wcQty);
            addTarget('100A-NEUTRAL-LINK', wcQty);
            addTarget('100A-MCB-1PH', wcQty);
        }
    }

    // F. "Meter Panel" Checkbox Legacy/Helper
    // If user clicked "Meter Panel" but is NOT in CT mode (so didn't get CT-PANEL)
    // AND didn't select WC Metering (so didn't get 100A-PANEL).
    // This allows a standalone panel if explicitly requested.
    if (meterPanelSelected && !isCtMode && config.wholeCurrentMetering !== 'Yes') {
        addTarget('100A-PANEL', ctQty); // Default to smaller panel if no rating/mode implies otherwise
    }

    // G. Site Reconnection (Auto-Add)
    // Rule: TRUNC((sections + 1) / 2)
    // Only applies if Board Width > 4m AND Shipping Sections > 1
    const boardWidth = config.boardWidth || 0;
    const shippingSections = config.shippingSections || 1;

    if (boardWidth > 4000) {
        const reconnectionUnits = Math.floor((shippingSections + 1) / 2);
        if (reconnectionUnits > 0) {
            addTarget('MISC-SITE-RECONNECTION', reconnectionUnits);
        }
    }


    // --- 2.5 IDENTIFY BUSBARS & CALCULATE CLEATS (Pre-Catalog Fetch) ---
    // We need to identify busbars early to calculate auto-cleats, 
    // so that the cleat Part Numbers are added to targets BEFORE we fetch the catalog.

    // Identify Busbars on this board
    const effectiveBusbarItems = new Map<string, { qty: number, price: number, labour: number, category: string }>();

    // 1. Process Existing Items first
    existingItems.forEach((item: Item) => {
        if (item.name === BUSBAR_INSULATION_ITEM) return;
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
        if (qty <= 0) {
            effectiveBusbarItems.delete(pn);
            return;
        }

        // Try to identify if target is busbar (basic heuristic + existing check)
        let isBusbar = false;
        let category = 'Basics';

        const existing = existingItems.find((i: Item) => i.name === pn);
        if (existing) category = existing.category;

        if (category?.toUpperCase() === 'BUSBAR' || pn.startsWith('BB-') || pn.startsWith('BBC-')) {
            isBusbar = true;
        }

        if (isBusbar) {
            const price = customPricing.get(pn) ?? (existing?.unitPrice || 0);
            const labour = customLabour.get(pn) ?? (existing?.labourHours || 0);
            effectiveBusbarItems.set(pn, { qty, price, labour, category });
        }
    });

    // --- CLEAT LOGIC (Form 3B Custom Only) ---
    // Strict Scope: Custom + Form 3B + Fault <= 50kA
    const isCustom = config.enclosureType === 'Custom';
    const isForm3B = (config.form || '').toLowerCase() === '3b'; // Form field might be "Form 3B" or just "3B" - strict check? "3b" matches plan.
    // Fault Rating Safety: Strip non-numeric and parse
    const faultRatingStr = config.faultRating || '999';
    const faultkA = parseInt(faultRatingStr.replace(/[^0-9]/g, '') || '999');
    const isFaultSafe = faultkA <= 50;

    const CLEAT_ITEMS = [
        '1B1-CLEAT-SMALL-1',
        '1B1-CLEAT-SMALL-2',
        '1B1-CLEAT-LARGE-2',
        '1B1-CLEAT-LARGE-3'
    ];

    // Track if we are managing cleats this run
    let managingCleats = false;

    if (isCustom && isForm3B && isFaultSafe) {
        managingCleats = true;
        const cleatMap = new Map<string, number>();

        effectiveBusbarItems.forEach((val, key) => {
            // Extract rating from Part Number
            const ratingMatch = key.match(/-(\d+)A/);
            if (ratingMatch && ratingMatch[1]) {
                const rating = parseInt(ratingMatch[1]);
                const cleatType = getCleatType(rating);

                if (cleatType) {
                    // Quantity Rule: ceil(Length_mm / 400) + 1
                    // val.qty is in Metres (e.g. 2.0).
                    // Length_mm = val.qty * 1000
                    // Formula: ceil((val.qty * 1000) / 400) + 1
                    const lengthMm = val.qty * 1000;
                    let cleatQty = Math.ceil(lengthMm / 400) + 1;

                    // Minimum check: If length > 0, we expect at least 2 cleats logic-wise from formula?
                    // 0.1m -> 100mm -> ceil(0.25) = 1 -> +1 = 2. Correct.
                    // 0m -> 0 -> 1. Correct. 
                    // Requirement says: "Minimum >0 length implies minimum 2 cleats."
                    if (lengthMm > 0 && cleatQty < 2) cleatQty = 2; // Should be covered by formula but safety first.

                    const currentTotal = cleatMap.get(cleatType) || 0;
                    cleatMap.set(cleatType, currentTotal + cleatQty);
                }
            }
        });

        // Add consolidated cleat targets
        cleatMap.forEach((qty, partNumber) => {
            // CHECK OVERRIDES
            if (cleatOverrides[partNumber] !== undefined) {
                console.log(`[Cleats] Overriding ${partNumber} qty to ${cleatOverrides[partNumber]}`);
                addTarget(partNumber, cleatOverrides[partNumber]);
            } else {
                addTarget(partNumber, qty);
            }
        });
    } else {
        console.log(`[Cleats] Skipping automation. Scope: Custom=${isCustom}, Form3B=${isForm3B}, FaultSafe=${isFaultSafe} (${faultkA}kA)`);
    }

    // --- 3. FETCH CATALOG DATA ---
    // We need catalog data BEFORE SS Calculation to properly price items like 1B-DOORS

    // Ensure 1A-COMPARTMENTS is targeted for Cubic before fetch
    if (config.enclosureType === 'Cubic') {
        targetItemPartNumbers.add('1A-COMPARTMENTS');
    }

    // Ensure SS Items are targeted before fetch so we get their Catalog Description
    if (config.enclosureType === 'Custom' && config.material === 'Powder 316 Stainless Steel') {
        targetItemPartNumbers.add('1B-SS-2B');
    } else if (config.enclosureType === 'Custom' && config.material === '316 Stainless Steel Natural Finish') {
        targetItemPartNumbers.add('1B-SS-NO4');
    }

    // Ensure Cubic Options are targeted before fetch
    if (config.enclosureType === 'Cubic') {
        if (config.isOver50kA === 'Yes') targetItemPartNumbers.add('1A-50KA');
        if (config.isNonStandardColour === 'Yes') targetItemPartNumbers.add('1A-COLOUR');
    }

    const targetPartNumbersArray = Array.from(targetItemPartNumbers);

    // Fetch catalog info for all targets
    const catalogItems = await prisma.catalogItem.findMany({
        where: { partNumber: { in: targetPartNumbersArray } }
    });
    const catalogMap = new Map<string, CatalogItem>(); // Local interface usage
    catalogItems.forEach((i: PrismaCatalogItem) => { if (i.partNumber) catalogMap.set(i.partNumber, i as any); });


    // --- 4. STAINLESS UPLIFT CALCULATION ---
    // Zero-Tier Check: If tierCount == 0, we don't do uplift (Misc/Base/Tiers are gone).
    // Requirement: "If tiers go to 0... Stainless uplift should be removed"

    if (tierCount > 0 && config.enclosureType === 'Custom' &&
        (config.material === 'Powder 316 Stainless Steel' || config.material === '316 Stainless Steel Natural Finish')) {

        // Calculate S = Sum of material costs for Sheet Metal Base Items
        let S = 0;

        for (const itemPn of SHEET_METAL_BASE_ITEMS) {
            // Determine Qty
            const targetQty = itemQuantities.get(itemPn);
            const existing = existingItems.find((i: Item) => i.name === itemPn);

            // Priority for Qty: Target > Existing > 0
            const qty = targetQty !== undefined ? targetQty : (existing?.quantity || 0);

            if (qty <= 0) continue;

            // Determine Unit Price
            // Priority: Custom Target Price > Existing Price > Catalog Price > 0
            let unitPrice = 0;

            if (customPricing.has(itemPn)) {
                unitPrice = customPricing.get(itemPn)!;
            } else if (existing) {
                unitPrice = existing.unitPrice;
            } else {
                // Determine form catalog
                const catParams = catalogMap.get(itemPn);
                unitPrice = catParams?.unitPrice || 0;
            }

            const itemCost = qty * unitPrice;

            console.log(`[SS Uplift] Item: ${itemPn}, Qty: ${qty}, Price: ${unitPrice}, Cost: ${itemCost}`);

            S += itemCost;
        }

        // Apply Factor
        const factor = config.material === 'Powder 316 Stainless Steel' ? 0.65 : 0.75;
        const upliftCost = S * factor;
        const upliftItemName = config.material === 'Powder 316 Stainless Steel' ? '1B-SS-2B' : '1B-SS-NO4';

        console.log(`Stainless Uplift: TotalBase=${S}, Factor=${factor}, Item=${upliftItemName}, Uplift=${upliftCost}`);

        addTarget(upliftItemName, 1, upliftCost);
    }

    // --- 5. CUBIC OPTIONS LOGIC (Post-Catalog Fetch) ---
    // We need the catalog unit price for 1A-COMPARTMENTS to calculate 50kA cost
    if (config.enclosureType === 'Cubic' && (config.totalCompartments || 0) > 0) {
        const totalCompartments = config.totalCompartments || 0;

        // 1. 1A-COMPARTMENTS (Auto-add)
        // Ref: "Auto-add 1A-COMPARTMENTS with qty = totalCompartments. Pull its unit price from catalog"
        const compartmentsItem = catalogMap.get('1A-COMPARTMENTS');
        const compartmentUnitPrice = compartmentsItem?.unitPrice || 0;

        if (compartmentsItem) {
            // Note: We already added it to targets in step 3.5 to ensure fetch, now we set qty/price
            addTarget('1A-COMPARTMENTS', totalCompartments, compartmentUnitPrice);
        } else {
            console.warn('1A-COMPARTMENTS missing from catalog. Cannot price Cubic options correctly.');
        }

        // 2. 1A-50KA (Over 50kA)
        if (config.isOver50kA === 'Yes') {
            // Formula: (Material Total of Compartments) / 4
            // Material Total = totalCompartments * compartmentUnitPrice
            const materialTotal = totalCompartments * compartmentUnitPrice;
            const cost50kA = materialTotal / 4;
            // Qty = 1, Unit Price = Cost
            // Labor Logic: For every $250 in material, add 1 hour labor
            const labour50kA = cost50kA / 250;
            addTarget('1A-50KA', 1, cost50kA, labour50kA);
        }

        // 3. 1A-COLOUR (Non-standard Colour)
        if (config.isNonStandardColour === 'Yes') {
            // Formula: Qty = compartments, Unit Price = 80, Labor = 0.1
            addTarget('1A-COLOUR', totalCompartments, 80, 0.1);
        }
    }


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
    // (Already done in Step 2.5 - reusing effectiveBusbarItems)

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



    // --- 4.5 SITE RECONNECTION (MOVED UP) ---
    // See section 2.G below

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
        '1B-600MM',
        '1B-800MM',
        '1B-SS-2B', '1B-SS-NO4',
        ...CUBIC_OPTIONS_ITEMS,
        BUSBAR_INSULATION_ITEM,
        'MISC-SITE-RECONNECTION',
        'MISC-CABLE-TRAY',
        '1A-50KA',
        '1B1-CLEAT-SMALL-1',
        '1B1-CLEAT-SMALL-2',
        '1B1-CLEAT-LARGE-2',
        '1B1-CLEAT-LARGE-3', // Note: Will be filtered out below if not managing
    ];

    // Add cleats to managed list ONLY if we are managing them this run
    if (managingCleats) {
        // They are already in the array above? 
        // No, wait. '1B1-CLEAT-SMALL-1' etc are in `allManagedItems` literal above.
        // We need to REMOVE them from `allManagedItems` if !managingCleats, so they are not deleted.
        // OR better: Define `allManagedItems` dynamically.
    }

    // Safety: Filter `allManagedItems` to exclude cleats if !managingCleats
    const finalManagedItems = allManagedItems.filter(name => {
        if (CLEAT_ITEMS.includes(name)) {
            return managingCleats;
        }
        return true;
    });

    const itemsToRemove = existingItems.filter((item: Item) =>
        item.isDefault &&
        (finalManagedItems.includes(item.name) || isManagedPattern(item.name)) &&
        !targetItemPartNumbers.has(item.name)
    );

    if (itemsToRemove.length > 0) {
        await prisma.item.deleteMany({
            where: { id: { in: itemsToRemove.map((i: Item) => i.id) } }
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

        const existingItem = existingItems.find((i: Item) => i.name === partNumber && i.isDefault);
        const catalogItem = catalogMap.get(partNumber);

        if (!existingItem && !catalogItem && !customPricing.has(partNumber)) {
            // It's possible for valid items (e.g. Busbar Insulation) to be purely dynamic with no catalog entry
            // but we must have pushed them via addTarget.
            console.warn(`Skipping ${partNumber}: No catalog item found and not existing/custom.`);
            return;
        }

        // Visibility Logic: Force Bascis category for these critical items
        const isCoreItem = ['1A-TIERS', '1B-TIERS-400', '1B-BASE', '1B-SS-2B', '1B-SS-NO4', ...CUBIC_OPTIONS_ITEMS, 'MISC-SITE-RECONNECTION'].includes(partNumber);
        const isBusbarInsulation = partNumber === BUSBAR_INSULATION_ITEM;
        const forcedCategory = isBusbarInsulation ? 'Busbar' : (isCoreItem ? 'Basics' : undefined);

        if (isBusbarInsulation) {
            console.log(`[BusbarInsulation] Processing item: ${partNumber}. Force Cat: ${forcedCategory}. Target Qty: ${targetQty}. Target Price: ${targetPrice}`);
        }

        if (existingItem) {
            // Update logic

            // AUTO-MANAGED PRICING LOGIC (Update)
            const FORMULA_ITEMS = [
                '1B-BASE',
                '1B-SS-2B', '1B-SS-NO4',
                '1B-600MM', '1B-800MM',
                '1A-50KA', '1A-COLOUR',
                BUSBAR_INSULATION_ITEM,

                '1B-TIERS-400'
            ];
            const isFormulaItem = FORMULA_ITEMS.includes(partNumber);

            let newUnitPrice = existingItem.unitPrice;
            let newLabour = existingItem.labourHours;

            if (isFormulaItem) {
                // Formula items: Explicitly use our calculated target price
                newUnitPrice = targetPrice !== undefined ? targetPrice : existingItem.unitPrice;
                newLabour = targetLabour !== undefined ? targetLabour : existingItem.labourHours;
            } else {
                // Catalog-managed defaults (e.g. 1A-TIERS, MISC-HARDWARE)
                // Prefer catalog price if available
                if (catalogItem) {
                    newUnitPrice = catalogItem.unitPrice;
                    newLabour = catalogItem.labourHours;
                } else {
                    newUnitPrice = targetPrice !== undefined ? targetPrice : existingItem.unitPrice;
                    newLabour = targetLabour !== undefined ? targetLabour : existingItem.labourHours;
                }
            }

            const newQty = targetQty; // We enforce quantity for auto-items

            // Only update if changes needed
            // Also force subcategory for 1A-50KA and 1A-COLOUR if updating
            const isCubicExtra = ['1A-50KA', '1A-COLOUR'].includes(partNumber);
            const CUBIC_SUBCATEGORY = 'Cubic Switchboard Enclosures (includes busbar supports)';
            const forcedSubcategory = isCubicExtra ? CUBIC_SUBCATEGORY : undefined;

            if (existingItem.quantity !== newQty ||
                (Math.abs(existingItem.unitPrice - newUnitPrice) > 0.01) ||
                (Math.abs(existingItem.labourHours - newLabour) > 0.01) ||
                (forcedCategory && existingItem.category !== forcedCategory) ||
                (forcedSubcategory && existingItem.subcategory !== forcedSubcategory) ||
                (existingItem.isSheetmetal !== (catalogItem?.isSheetmetal || false))) {

                await prisma.item.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: newQty,
                        unitPrice: newUnitPrice,
                        labourHours: newLabour,
                        cost: newUnitPrice * newQty,
                        category: forcedCategory || existingItem.category, // Enforce basics/busbar if needed
                        subcategory: forcedSubcategory || existingItem.subcategory,
                        isSheetmetal: catalogItem?.isSheetmetal || false
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

            // AUTO-MANAGED PRICING LOGIC
            // 1. Formula items: computed targetPrice always wins
            // 2. Catalog-managed defaults: catalog price wins (if available)
            // 3. Fallback: use targetPrice (if provided, e.g. calculated) or 0

            // Define Formula Items (Price is computed, don't use catalog price)
            const FORMULA_ITEMS = [
                '1B-BASE',
                '1B-SS-2B', '1B-SS-NO4',
                '1B-600MM', '1B-800MM',
                '1A-50KA', '1A-COLOUR',
                BUSBAR_INSULATION_ITEM,

                '1B-TIERS-400'
            ];

            const isFormulaItem = FORMULA_ITEMS.includes(partNumber);
            const isCubicExtra = ['1A-50KA', '1A-COLOUR'].includes(partNumber);
            const CUBIC_SUBCATEGORY = 'Cubic Switchboard Enclosures (includes busbar supports)';

            const forcedSubcategory = isCubicExtra ? CUBIC_SUBCATEGORY : undefined;

            let finalUnitPrice = 0;
            let finalLabourHours = 0;

            if (isFormulaItem) {
                // Formula items: Explicitly use our calculated target price
                finalUnitPrice = targetPrice !== undefined ? targetPrice : 0;
                finalLabourHours = targetLabour !== undefined ? targetLabour : 0;
            } else {
                // Catalog-managed defaults (e.g. 1A-TIERS, MISC-HARDWARE)
                // Prefer catalog price if available, otherwise targetPrice
                if (catalogItem) {
                    finalUnitPrice = catalogItem.unitPrice;
                    finalLabourHours = catalogItem.labourHours;
                } else {
                    finalUnitPrice = targetPrice !== undefined ? targetPrice : 0;
                    finalLabourHours = targetLabour !== undefined ? targetLabour : 0;
                }
            }

            await prisma.item.create({
                data: {
                    boardId,
                    category: forcedCategory || catItem.category || 'Basics',
                    subcategory: forcedSubcategory || catItem.subcategory,
                    name: catalogItem?.partNumber || partNumber,
                    description: catItem.description,
                    unitPrice: finalUnitPrice,
                    labourHours: finalLabourHours,
                    quantity: targetQty,
                    cost: finalUnitPrice * targetQty,
                    isDefault: true,
                    isSheetmetal: catalogItem?.isSheetmetal || false
                }
            });
        }
    }));
}
