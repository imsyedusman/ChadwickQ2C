import prisma from './prisma';
import { Item, CatalogItem as PrismaCatalogItem } from '@prisma/client';
import { calculateBusbarUnitPrice } from './pricing';
import { Prisma } from '@prisma/client'; // For Decimal

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
    ctSpareProvision?: string; // 'Yes' | 'No'
    ctSpareQuantity?: number;
    wholeCurrentMeters?: { type: string; quantity: number }[];
    bakeliteQty?: number;
    extraForDoorsOver?: boolean;
    internalNotes?: string;
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
    // Dynamic Pricing Support
    totalCopperWeightKgPerMeter?: number | null;
    isCopperPriced?: boolean;
}

const SURGE_DIVERTER_PARTS = [
    'TDS-MPM-277',
    'TDX100C-277/480',
    'TDX100M-277/480TT',
    'TDX200M-277/480TT',
    'TDS-MT-277',
    'SDN3-100-275',
    'SD3-200',
    'TDS350-TT-277',
    'DSD340-TNS-275A',
    'DSD140-1SR-275',
    'SD3-40N'
];

const FUSE_63A_PART = 'IPD-FUSE-63A';
const WIRING_SURGE_PART = 'IPD-WIRING-SURGE';

const DIGITAL_METER_PARTS = [
    'A9MEM3155', 'A9MEM3355', 'A9MEM3255', 'METSEPM3250', 'METSEPM5110',
    'METSEPM5350', 'METSEPM5560', 'METSEPM8240', 'EM2172RVV53XOSX',
    'EM24DINAV93XISX', 'EM24DINAV53DISX', 'MF72421', 'NEMO96HD1000',
    'NEMO96HD1300', 'EM27072DMV53X2SN', '48250402', '48250500', '48250501',
    '48290505', '48290200', '48290504', '48290101', '48290102', '48290506',
    '48290204', '48290105', '48290106', '48290110', '48290111', '48290128',
    '48290130', '48290500', '48290501', '48290502', '48290503', '48290112',
    '15197', '17066', 'A9N15636', 'METSEPM2220', 'METSEPM2220R', 'METSEPM2230',
    'METSEPM3200', 'METSEPM3210', 'METSEPM3255', 'METSEPM5310', 'METSEPM5310R',
    'METSEPM5320', 'METSEPM5320R', 'METSEPM5330', 'METSEPM5340', 'METSEPM5350P',
    'METSEPM5563', 'METSEPM5563RD', 'METSEPM5580', 'METSEPM8210', 'METSEPM8213',
    'METSEPM8214', 'METSEEMD461R', 'METSEPM8240-NMI', 'METSEPM8240DEMO',
    'METSEPM8243', 'METSEPM8244', 'METSEPM8244-NMI', 'LV434001', 'LV434002',
    'LV434201', 'LV434205', 'LV454444', 'TRV00217', 'A9MEM3165', 'PM820UMG',
    'PM850UMG', 'FSR2DK2X05A', 'H8163-0800-4-3', 'H8186-CB', 'LV434000',
    'A9MEM1520', 'A9MEM1521', 'A9MEM1522', 'A9MEM1540', 'A9MEM1541', 'A9MEM1542',
    'A9MEM1560', 'A9MEM1563', 'A9MEM1570', 'A9MEM1573', 'A9MEM1580', 'A9MEM1590',
    'A9MEM1591', 'A9MEM1592', 'A9MEM1593', 'A9MEM2000', 'A9MEM2000T', 'A9MEM2010',
    'A9MEM2105', 'A9MEM2110', 'A9MEM2150', 'A9MEM2155', 'A9MEM3100', 'A9MEM3110',
    'A9MEM3115', 'A9MEM3150', 'A9MEM3150-NMI', 'A9MEM3155-NMI', 'A9MEM3200',
    'A9MEM3210', 'A9MEM3215', 'A9MEM3250', 'A9MEM3250-NMI', 'A9MEM3255-NMI',
    'A9MEM3265', 'A9MEM3265-NMI', 'A9MEM3275', 'A9MEM3275-NMI', 'A9MEM3300',
    'A9MEM3310', 'A9MEM3350', 'A9MEM3350-NMI', 'A9MEM3355-NMI', 'A9MEM3365',
    'A9MEM3375', 'A9MEM3455', 'A9MEM3465', 'A9MEM3555', 'AH06'
];

const CT_PARTS = [
    'TAS127B40005A', 'TAS127B30005A', 'TAS102H25005A', 'TAS102H20005A',
    'TAS6512005A', 'TAS6510005A', 'TAS656005A', 'TAIBB405A'
];

const FUSE_20A_DIN = 'CHD-FUSE-20A-DIN';
const WIRING_DIGITAL = 'IPD-WIRING-DIGITAL';
const TEST_LINKS = 'NHP-TEST-LINK';
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
    '100A-MCB-3PH',
    '100A-WIRING-1PH',
    '100A-WIRING-3PH',
    '100A-CHASSIS-18',
    '100A-CHASSIS-24',
    '100A-CHASSIS-30'
];

const BUSBAR_INSULATION_ITEM = 'Busbar Insulation';

// Tier items - source of truth for tier count
const TIER_ITEMS = ['1A-TIERS', '1B-TIERS-400'];

// MISC items that scale with tier count
const MISC_TIER_ITEMS = ['MISC-LABELS', 'MISC-HARDWARE', 'MISC-TEST-TIERS'];

// Delivery items - only one should exist at a time
const MISC_DELIVERY_ITEMS = ['MISC-DELIVERY-UTE', 'MISC-DELIVERY-HIAB'];

// Helper function to determine current band based on current rating
export function getCurrentBand(currentRating: string): string | null {
    if (currentRating === '4000A') return null;
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
    return null;
}

// Helper function to get busbar part number based on current band and enclosure type
export function getBusbarPartNumber(currentRating: string, enclosureType: string): string | null {
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
            '3200A': 'BB-3000A'
        };
        if (!band) return null;
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
            '3200A': 'BBC-2800A'
        };
        if (!band) return null;
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
        '3200A': 'CT-3200A'
    };

    if (!band) return null;
    return labourMapping[band] || null;
}

// Helper to add CT items (Shared between Active and Spare)
function addCtItems(
    targetMap: (part: string, qty: number) => void,
    qty: number,
    includeCtType: boolean,
    config: BoardConfig,
    existingItems: any[]
) {
    // Layer 1 – Core CT Metering (always added when CT Metering = Yes)
    targetMap('CT-COMPARTMENTS', qty);

    // CT Type (Coils) - Only if Active Metering
    if (includeCtType && config.ctType) {
        targetMap(`CT-${config.ctType}-TYPE`, qty);
    }

    // Layer 2 – Meter Panel Section (only added when Meter Panel Included = Yes)
    if (config.meterPanel === 'Yes') {
        targetMap('CT-PANEL', qty);
        targetMap('CT-TEST-BLOCK', qty);
        targetMap('CT-WIRING', qty);
    }

    // 4. Busbars & Labour (Only if rating available)
    if (config.currentRating) {
        // Busbars
        if (config.enclosureType) {
            const busbarPartNumber = getBusbarPartNumber(config.currentRating, config.enclosureType);
            if (busbarPartNumber) {
                // Respect user edits for busbars (don't force-reset to 1)
                // BUT skip if already added in this sync to prevent compounding / doubling.
                // Busbars represent the entire board's copper system, so they only need to be initialized once per sync.
                if (! (targetMap as any).tracker?.has(busbarPartNumber)) {
                    if (! (targetMap as any).tracker) (targetMap as any).tracker = new Set<string>();
                    (targetMap as any).tracker.add(busbarPartNumber);

                    const existingBusbar = existingItems.find((i: Item) => i.name === busbarPartNumber);
                    const busbarQty = existingBusbar ? existingBusbar.quantity : 1;
                    targetMap(busbarPartNumber, busbarQty);
                }
            }
        }
        // Labour
        const labour = getLabourPartNumber(config.currentRating);
        if (labour) targetMap(labour, qty);
    }
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

    // Atomic Safety Check: Legacy ratings (4000A, 63kA) trigger escape to prevent inconsistent automation.
    if (config.currentRating === '4000A' || config.faultRating === '63kA') {
        console.warn(`Legacy rating detected (${config.currentRating || config.faultRating}) - automation skipped for boardId: ${boardId}`);
        return;
    }

    // Fetch existing items to respect manual edits
    // Also fetch Quote settings for overrides
    const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: { items: true, quote: true }
    });

    if (!board) return;
    const boardItems = board.items;

    // Load Overrides from Quote Settings
    let overrides: any = {};
    if (board.quote?.settingsSnapshot) {
        try {
            const settings = JSON.parse(board.quote.settingsSnapshot);
            if (settings.mccbOverrides && settings.mccbOverrides[boardId]) {
                overrides = settings.mccbOverrides[boardId];
            }
        } catch (e) { }
    }
    const deletedSkus: string[] = overrides.deletedSkus || [];

    // Calculate global pricing context
    let effectiveCopperPrice = 15.0;
    const globalSettings = await prisma.settings.findUnique({ where: { id: 'global' } });

    if (board.quote?.overrideCopperPricePerKg != null) {
        effectiveCopperPrice = Number(board.quote.overrideCopperPricePerKg);
    } else if (globalSettings?.copperPricePerKg != null) {
        effectiveCopperPrice = Number(globalSettings.copperPricePerKg);
    }

    const pricingContext = { copperPrice: effectiveCopperPrice };

    let existingItems = board.items;

    // --- COMPOSITE SYNC BLOCK ---
    // Execute before other automation blocks.
    const partNumbers = Array.from(new Set(existingItems.map((i: any) => i.partNumber).filter(Boolean) as string[]));
    if (partNumbers.length > 0) {
        // Bulk fetch catalog items to avoid N+1 queries
        const catalogItems = await prisma.catalogItem.findMany({
            where: { partNumber: { in: partNumbers } }
        });
        const catalogMap = new Map((catalogItems as any[]).map(c => [c.partNumber, c]));

        const compositeRequirements = new Map<string, number>();

        // 1. Calculate Requirements
        for (const item of existingItems) {
            if (!item.partNumber) continue;
            // Only non-composite items generate children (no resurrection loops)
            if ((item as any).systemTag === 'COMPOSITE') continue;

            const catItem = catalogMap.get(item.partNumber);
            if (catItem && (catItem as any).components) {
                let comps: any[] = [];
                try {
                    comps = typeof (catItem as any).components === 'string' ? JSON.parse((catItem as any).components) : (catItem as any).components;
                } catch (e) {
                    // Ignore parse error
                }

                if (Array.isArray(comps)) {
                    for (const comp of comps) {
                        if (comp.partNumber && comp.quantity) {
                            const desiredQty = Number(item.quantity) * Number(comp.quantity);
                            const currentQty = compositeRequirements.get(comp.partNumber) || 0;
                            compositeRequirements.set(comp.partNumber, currentQty + desiredQty);
                        }
                    }
                }
            }
        }

        let compositesChanged = false;

        // 2. Cleanup orphaned composites
        // Only remove items where systemTag === 'COMPOSITE'
        // Only remove if no parent in current board selection references them
        for (const item of existingItems) {
            if (item.isSystemManaged === true && (item as any).systemTag === 'COMPOSITE' && item.partNumber) {
                if (!compositeRequirements.has(item.partNumber)) {
                    await prisma.item.delete({ where: { id: item.id } });
                    compositesChanged = true;
                }
            }
        }

        // 3. Upsert required composites
        for (const [compPart, reqQty] of compositeRequirements.entries()) {
            const existingChild = existingItems.find((i: any) => i.partNumber === compPart && i.systemTag === 'COMPOSITE' && i.isSystemManaged === true);

            if (existingChild) {
                if (Number(existingChild.quantity) !== reqQty || (existingChild as any).systemRuleType !== 'COMPOSITE_SYNC') {
                    await prisma.item.update({
                        where: { id: existingChild.id },
                        data: {
                            quantity: reqQty,
                            cost: existingChild.unitPrice * reqQty,
                            isSystemManaged: true,
                            systemTag: 'COMPOSITE',
                            systemRuleType: 'COMPOSITE_SYNC'
                        } as any
                    });
                    compositesChanged = true;
                }
            } else {
                const childCatItem = await prisma.catalogItem.findFirst({
                    where: { partNumber: compPart }
                });

                if (childCatItem) {
                    await prisma.item.create({
                        data: {
                            boardId,
                            category: childCatItem.category || 'Switchboard',
                            subcategory: childCatItem.subcategory || 'Miscellaneous',
                            name: childCatItem.partNumber || 'Composite Component',
                            partNumber: compPart,
                            description: childCatItem.description || 'Composite Component',
                            quantity: reqQty,
                            unitPrice: childCatItem.unitPrice,
                            labourHours: childCatItem.labourHours,
                            cost: childCatItem.unitPrice * reqQty,
                            isSystemManaged: true,
                            systemTag: 'COMPOSITE',
                            systemRuleType: 'COMPOSITE_SYNC',
                            isDefault: true,
                            notes: 'System Managed'
                        } as any
                    });
                    compositesChanged = true;
                }
            }
        }

        // 4. Re-fetch board items once so downstream logic uses updated state
        if (compositesChanged) {
            const refreshedBoard = await prisma.board.findUnique({
                where: { id: boardId },
                include: { items: true }
            });
            if (refreshedBoard) {
                existingItems = refreshedBoard.items;
            }
        }
    }
    // --- END COMPOSITE SYNC BLOCK ---

    // --- DIGITAL METER AUTOMATION ---
    console.log('\n--- DIGITAL METER SYNC STARTED ---');
    console.log('DIGITAL_METER_PARTS length:', DIGITAL_METER_PARTS.length);
    console.log('existingItems length:', existingItems.length);

    // Enforce strict existence:
    const requiredDM = [WIRING_DIGITAL, FUSE_20A_DIN, TEST_LINKS];
    console.log('[DM Auto Debug] Checking catalog for:', requiredDM);
    const catCheck = await prisma.catalogItem.findMany({
        where: { partNumber: { in: requiredDM } },
        select: { partNumber: true, unitPrice: true, description: true }
    });
    const foundCatParts = catCheck.map(c => c.partNumber);
    console.log('[DM Auto Debug] Found in catalog:', foundCatParts);
    for (const req of requiredDM) {
        if (!foundCatParts.includes(req)) {
            console.warn(`[DM Auto Debug] [WARNING] Digital Meter Auto: CatalogItem missing for part '${req}'. Auto-add might fail.`);
        } else {
            const details = catCheck.find(c => c.partNumber === req);
            console.log(`[DM Auto Debug] Catalog Detail for ${req}: Desc="${details?.description}", Price=${details?.unitPrice}`);
        }
    }

    // Extract `totalMeters` strictly using partNumber
    let totalMeters = 0;
    console.log('[DM Auto Debug] Scanning existingItems for digital meters...');
    for (const item of existingItems) {
        if (item.partNumber && DIGITAL_METER_PARTS.includes(item.partNumber)) {
            if (item.systemTag === 'COMPOSITE') {
                console.log(`[DM Auto Debug] Skipping meter ${item.partNumber} because it is a COMPOSITE parent.`);
                continue;
            }
            const qty = Number(item.quantity) || 0;
            console.log(`[DM Auto Debug] Detected Meter: ${item.partNumber}, Qty: ${qty}`);
            totalMeters += qty;
        }
    }

    console.log('[DM Auto Debug] Final totalMeters count:', totalMeters);

    // 1. Compute and Apply Derived Quantities 
    const dmTargets = new Map<string, number>();
    if (totalMeters > 0) {
        const wiringQty = totalMeters;
        const fuseQty = wiringQty * 3; // Dependency: Fuse Qty = Wiring Qty * 3
        console.log(`[DM Auto Debug] Derived Quantities: Wiring=${wiringQty}, Fuses=${fuseQty}, TestLinks=${totalMeters}, CTs=${totalMeters * 3}`);

        dmTargets.set(WIRING_DIGITAL, wiringQty);
        dmTargets.set(FUSE_20A_DIN, fuseQty);
        dmTargets.set(TEST_LINKS, totalMeters);
        dmTargets.set('TAIBB405A', totalMeters * 3);
    } else {
        console.log('[DM Auto Debug] No meters detected. dmTargets will be empty.');
    }

    // Note: CT Balancing logic removed in favor of strict proportional scaling per meter.
    // Manual CTs are still protected by the cleanup logic which only touches systemTag='DIGITAL_METER'.

    // Apply creation / updates to targets natively
    let digitalMetersChanged = false;

    for (const [part, requiredQty] of dmTargets.entries()) {
        // Search first for an item already tagged as DIGITAL_METER
        // If not found, look for an untagged isSystemManaged item with the same part number to "adopt" it
        const existingChild = existingItems.find(i => 
            (i.partNumber === part || i.name === part) && 
            (i.systemTag === 'DIGITAL_METER' || (!i.systemTag && i.isSystemManaged))
        );

        console.log(`[DM Auto Debug] Targeting ${part}: RequiredQty=${requiredQty}, FoundExisting=${existingChild ? 'YES (ID: ' + existingChild.id + ', Qty: ' + Number(existingChild.quantity) + ')' : 'NO'}`);

        if (existingChild) {
            const currentQty = Number(existingChild.quantity) || 0;
            const needsQtyUpdate = currentQty !== requiredQty;
            const needsTagUpdate = existingChild.systemTag !== 'DIGITAL_METER';
            if (needsQtyUpdate || needsTagUpdate) {
                // Only update if still system managed
                if (existingChild.isSystemManaged || needsTagUpdate) {
                    console.log(`[DM Auto Debug] Updating ${part}: Qty(${currentQty}->${requiredQty}), Tag(${existingChild.systemTag}->DIGITAL_METER)`);
                    try {
                        await prisma.item.update({
                            where: { id: existingChild.id },
                            data: {
                                quantity: requiredQty,
                                cost: Number(existingChild.unitPrice || 0) * requiredQty,
                                systemTag: 'DIGITAL_METER',
                                systemRuleType: 'DIGITAL_METER_AUTOMATION'
                            } as any
                        });
                        console.log(`[DM Auto Debug] Update SUCCESS for ${part}`);
                        digitalMetersChanged = true;
                    } catch (err: any) {
                        console.error(`[DM Auto Debug] Update FAILED for ${part}:`, err.message);
                    }
                } else {
                    console.log(`[DM Auto Debug] Item ${part} quantity differs but it is NO LONGER system managed. Respecting user override.`);
                }
            } else {
                console.log(`[DM Auto Debug] Item ${part} already correctly managed. Skipping update.`);
            }
        } else {
            // Check if manually deleted
            if (deletedSkus.includes(part)) {
                console.log(`[DM Auto] Skipping manually deleted item ${part}`);
                continue;
            }

            console.log(`[DM Auto Debug] No existing ${part} found with systemTag="DIGITAL_METER". Attempting to create...`);
            const catItem = await prisma.catalogItem.findFirst({
                where: { partNumber: part }
            });
            if (catItem) {
                console.log(`[DM Auto Debug] Catalog resolution for ${part}: SUCCESS. Creating item...`);
                try {
                    await prisma.item.create({
                        data: {
                            boardId,
                            category: catItem.category || 'Switchboard',
                            subcategory: catItem.subcategory || 'Control',
                            name: catItem.partNumber || part,
                            partNumber: part,
                            description: catItem.description || 'Digital Meter Accessory',
                            quantity: requiredQty,
                            unitPrice: catItem.unitPrice,
                            labourHours: catItem.labourHours,
                            cost: Number(catItem.unitPrice || 0) * requiredQty,
                            isSystemManaged: true,
                            isDefault: true,
                            systemTag: 'DIGITAL_METER',
                            systemRuleType: 'DIGITAL_METER_AUTOMATION',
                            notes: 'System Managed'
                        } as any
                    });
                    console.log(`[DM Auto Debug] Creation SUCCESS for ${part}`);
                    digitalMetersChanged = true;
                } catch (err: any) {
                    console.error(`[DM Auto Debug] Creation FAILED for ${part}:`, err.message);
                }
            } else {
                console.warn(`[DM Auto Debug] [ERROR] Could not create ${part}. Catalog item not found.`)
            }
        }
    }

    // 3. Scoped Deletions
    // Only delete items where systemTag === 'DIGITAL_METER' AND isSystemManaged === true AND qty is 0.
    const dmItemsToRemove = existingItems.filter(i =>
        i.systemTag === 'DIGITAL_METER' &&
        i.isSystemManaged === true &&
        !dmTargets.has(i.partNumber || i.name)
    );

    if (dmItemsToRemove.length > 0) {
        await prisma.item.deleteMany({
            where: { id: { in: dmItemsToRemove.map(i => i.id) } }
        });
        digitalMetersChanged = true;
    }

    // 4. Re-fetch board items for downstream processing
    if (digitalMetersChanged) {
        console.log('[DM Auto] State mutated. Re-fetching existingItems from database.');
        const refreshedBoard = await prisma.board.findUnique({
            where: { id: boardId },
            include: { items: true }
        });
        if (refreshedBoard) {
            existingItems = refreshedBoard.items;
        }
    }
    // --- END DIGITAL METER AUTOMATION ---

    // --- SURGE DIVERTER AUTOMATION ---
    console.log('\n--- SURGE DIVERTER SYNC STARTED ---');
    let totalSurgeQty = 0;
    for (const item of existingItems) {
        if (SURGE_DIVERTER_PARTS.includes(item.name) && item.systemTag !== 'COMPOSITE') {
            totalSurgeQty += Number(item.quantity) || 0;
        }
    }

    const requiredFuseQty = totalSurgeQty * 3;
    const requiredWiringQty = totalSurgeQty * 1;
    let surgeChanged = false;

    if (totalSurgeQty > 0) {
        const surgeTargets = [
            { part: FUSE_63A_PART, qty: requiredFuseQty },
            { part: WIRING_SURGE_PART, qty: requiredWiringQty }
        ];

        for (const target of surgeTargets) {
            if (target.qty === 0) continue;

            const existingChild = existingItems.find(
                i => i.name === target.part && (i as any).systemRuleType === 'SURGE_AUTOMATION'
            );
            if (existingChild) {
                if (Number(existingChild.quantity) !== target.qty && (existingChild as any).isSystemManaged) {
                    console.log(`[Surge Auto] Updating ${target.part} qty to ${target.qty}`);
                    await prisma.item.update({
                        where: { id: existingChild.id },
                        data: { quantity: target.qty, cost: Number(existingChild.unitPrice || 0) * target.qty }
                    });
                    surgeChanged = true;
                }
            } else {
                // Check if manually deleted
                if (deletedSkus.includes(target.part)) {
                    console.log(`[Surge Auto] Skipping manually deleted item ${target.part}`);
                    continue;
                }

                // Create
                console.log(`[Surge Auto] Creating ${target.part} (qty=${target.qty})`);
                const catItem = await prisma.catalogItem.findFirst({
                    where: { partNumber: target.part }
                });
                if (catItem) {
                    await prisma.item.create({
                        data: {
                            boardId,
                            category: catItem.category || 'Switchboard',
                            subcategory: catItem.subcategory || 'Control',
                            name: catItem.partNumber || target.part,
                            partNumber: target.part,
                            description: catItem.description || 'Surge Diverter Accessory',
                            quantity: target.qty,
                            unitPrice: catItem.unitPrice,
                            labourHours: catItem.labourHours,
                            cost: Number(catItem.unitPrice || 0) * target.qty,
                            isSystemManaged: true,
                            isDefault: true,
                            systemTag: 'SURGE_PROTECTION',
                            systemRuleType: 'SURGE_AUTOMATION',
                            notes: 'System Managed'
                        } as any
                    });
                    surgeChanged = true;
                } else {
                    console.warn(`[Surge Auto] Missing catalog item for ${target.part}`);
                }
            }
        }
    } else {
        const surgeItemsToRemove = existingItems.filter(i => (i as any).systemRuleType === 'SURGE_AUTOMATION');
        if (surgeItemsToRemove.length > 0) {
            console.log(`[Surge Auto] Removing ${surgeItemsToRemove.length} orphaned items`);
            await prisma.item.deleteMany({
                where: { id: { in: surgeItemsToRemove.map(i => i.id) } }
            });
            surgeChanged = true;
        }
    }

    if (surgeChanged) {
        console.log('[Surge Auto] State mutated. Re-fetching existingItems from database.');
        const refreshedBoard = await prisma.board.findUnique({
            where: { id: boardId },
            include: { items: true }
        });
        if (refreshedBoard) {
            existingItems = refreshedBoard.items;
        }
    }
    // --- END SURGE DIVERTER AUTOMATION ---

    // Parse Settings/Overrides
    let cleatOverrides: Record<string, number> = {};
    if (board.quote?.settingsSnapshot) {
        try {
            const settings = JSON.parse(board.quote.settingsSnapshot);
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

        // Helper to safely get number from Decimal or Int
        const getQty = (item: Item) => Number(item.quantity) || 0;

        if (config.enclosureType === 'Cubic' && cubicTierItem) {
            tierCount = getQty(cubicTierItem);
        } else if (config.enclosureType === 'Custom' && customTierItem) {
            tierCount = getQty(customTierItem);
        } else {
            // Fallback to whichever exists if enclosure type isn't strict match or switching
            if (cubicTierItem) tierCount = getQty(cubicTierItem);
            else if (customTierItem) tierCount = getQty(customTierItem);
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

    const addTarget = (partNumber: string, qty: number | Prisma.Decimal, unitPrice?: number, labourHours?: number) => {
        targetItemPartNumbers.add(partNumber);
        // If item already exists in map, take max (logic specific) or just strict set
        // Here we strictly set what we want.
        itemQuantities.set(partNumber, Number(qty));
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

        // 1. Outdoor Doors (Legacy implicitly added, now explicitly managed via extraForDoorsOver)
        // Removed legacy: if (config.location === 'Outdoor') addTarget('1B-DOORS', tierCount);

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
    // Refactored 2026-02-17 to allow Coexistence of CT and Whole Current Metering (Scoped Ownership)

    // Helper: Tag Registry for this run
    const itemTags = new Map<string, string>(); // PartNumber -> SystemTag

    // 1. Centralize Mode Decisions
    // Note: ctMetering check is strictly case-insensitive "yes". Blanks/Undefined/No are FALSE.
    const amps = parseInt((config.currentRating || '0').replace(/[^0-9]/g, '')) || 0;
    const ctMeteringStrict = (config.ctMetering || '').toLowerCase() === 'yes';
    const isOver100A = amps > 100;

    const isCtMode = ctMeteringStrict; // STRICTLY user choice only
    const isWcMode = config.wholeCurrentMetering === 'Yes';

    // DEBUG LOGGING
    console.log('--- METERING DEBUG ---');
    console.log(`Config CT Metering: "${config.ctMetering}"`);
    console.log(`Config Current Rating: "${config.currentRating}"`);
    console.log(`Parsed Amps: ${amps}`);
    console.log(`Is Over 100A: ${isOver100A}`);
    console.log(`CT Strict (Yes?): ${ctMeteringStrict}`);
    console.log(`CT MODE ACTIVE: ${isCtMode}`);
    console.log(`WC METERING ACTIVE: ${config.wholeCurrentMetering === 'Yes' || (config.wholeCurrentMeters && config.wholeCurrentMeters.length > 0)}`);
    console.log('----------------');

    const ctQty = config.ctQuantity || 1;
    const meterPanelSelected = config.meterPanel === 'Yes';

    // --- 1.5 HARD METERING CLEANUP PHASE ---
    let cleanupOccurred = false;

    // Hard Delete CT
    if (!isCtMode) {
        const ctItemsToPurge = existingItems.filter((i: Item) =>
            i.systemTag === 'CT' || (i as any).systemRuleType === 'CT_AUTOMATION'
        );
        if (ctItemsToPurge.length > 0) {
            console.log(`[Metering] Hard Cleanup: Removing ${ctItemsToPurge.length} CT items because CT mode is OFF.`);
            await prisma.item.deleteMany({
                where: { id: { in: ctItemsToPurge.map(i => i.id) } }
            });
            cleanupOccurred = true;
        }
    }

    // Hard Delete WC
    if (!isWcMode) {
        const wcItemsToPurge = existingItems.filter((i: Item) =>
            i.systemTag === 'WHOLE_CURRENT' || (i as any).systemRuleType === 'WHOLE_CURRENT_AUTOMATION'
        );
        if (wcItemsToPurge.length > 0) {
            console.log(`[Metering] Hard Cleanup: Removing ${wcItemsToPurge.length} WC items because WC mode is OFF.`);
            await prisma.item.deleteMany({
                where: { id: { in: wcItemsToPurge.map(i => i.id) } }
            });
            cleanupOccurred = true;
        }
    }

    // Hard Delete Fallback Meter Panel
    if (isCtMode || isWcMode) {
        const fallbackPanelsToPurge = existingItems.filter((i: Item) =>
            i.systemTag === 'METER_PANEL_FALLBACK' || (i as any).systemRuleType === 'METER_PANEL_FALLBACK'
        );
        if (fallbackPanelsToPurge.length > 0) {
            console.log(`[Metering] Hard Cleanup: Removing ${fallbackPanelsToPurge.length} Fallback Panels because an active metering mode exists.`);
            await prisma.item.deleteMany({
                where: { id: { in: fallbackPanelsToPurge.map(i => i.id) } }
            });
            cleanupOccurred = true;
        }
    }

    // Reload existing items if mutated before applying logic
    if (cleanupOccurred) {
        const refreshedBoard = await prisma.board.findUnique({
            where: { id: boardId },
            include: { items: true }
        });
        if (refreshedBoard) {
            existingItems = refreshedBoard.items;
        }
    }

    // 2. APPLY LOGIC

    // D. CT Metering & Spare CT Provisioning (Additive Logic)
    // Runs if CT Mode is ACTIVE OR Spare is requested.

    // Helper accumulator for CT logic
    const ctTotals = new Map<string, Prisma.Decimal>();
    const addCtTarget = (part: string, qty: number | Prisma.Decimal) => {
        const current = ctTotals.get(part) || new Prisma.Decimal(0);
        const addition = new Prisma.Decimal(qty as any);
        ctTotals.set(part, current.plus(addition));
        itemTags.set(part, 'CT'); // Mark ownership
    };

    // 1. Active Metering
    if (isCtMode) {
        const activeQty = config.ctQuantity || 1;
        addCtItems(addCtTarget, activeQty, true, config, existingItems);
    }

    // 2. Spare CT Provisioning
    if (config.ctSpareProvision === 'Yes') {
        const spareQty = config.ctSpareQuantity || 1;
        addCtItems(addCtTarget, spareQty, false, config, existingItems);
    }

    // 3. Apply Totals to Main Target Map & Scoped Cleanup
    ctTotals.forEach((qty, part) => {
        addTarget(part, qty);
    });

    // SCOPED CLEANUP: CT
    // Delete items OWNED by CT (systemTag='CT') that are NOT in current targets involved in CT logic.
    // Note: We use 'ctTotals' keys to know what IS required. Anything else tagged 'CT' is not.
    // Actually, 'targetItemPartNumbers' now includes ctTotals.
    // We strictly look for items in DB that are tag='CT' but NOT in our new target set.
    const ctItemsToRemove = existingItems.filter((i: Item) =>
        i.systemTag === 'CT' &&
        !ctTotals.has(i.name) // Strict: If it's not in the calculated CT totals, it's gone.
    );

    if (ctItemsToRemove.length > 0) {
        console.log(`[Metering] Cleaning up ${ctItemsToRemove.length} orphaned CT items.`);
        await prisma.item.deleteMany({
            where: { id: { in: ctItemsToRemove.map(i => i.id) } }
        });
    }

    // E. Whole Current Metering
    // Independent Logic Block. Can coexist with CT.

    // 1. Normalize Config
    let meterList: { type: string, quantity: number }[] = [];

    // DEFENSE IN DEPTH: Only populate meterList if the toggle is explicitly YES.
    // If config.wholeCurrentMetering is 'No' (or falsy), we force meterList to be empty.
    if (config.wholeCurrentMetering === 'Yes') {
        if (config.wholeCurrentMeters && config.wholeCurrentMeters.length > 0) {
            meterList = config.wholeCurrentMeters;
        } else {
            // Legacy / Single mode fallback (if array missing but Yes selected)
            meterList = [{ type: config.wcType || '', quantity: config.wcQuantity || 1 }];
        }
    }

    // 2. Check if WC Active
    const isWcActive = meterList.length > 0;

    if (isWcActive) {
        // DIAGNOSTIC LOGGING: Investigate production fuse calculation issues
        console.log(`[Metering] WC Logic Started for Board ${boardId}`);
        console.log(`[Metering] Config:`, { 
            wholeCurrentMetering: config.wholeCurrentMetering,
            wcType: config.wcType,
            wcQuantity: config.wcQuantity,
            meterCount: meterList.length,
            meters: JSON.stringify(meterList)
        });

        // Local Accumulator
        const wcTotals = new Map<string, Prisma.Decimal>();
        const addWc = (part: string, qty: number | Prisma.Decimal) => {
            const current = wcTotals.get(part) || new Prisma.Decimal(0);
            wcTotals.set(part, current.plus(new Prisma.Decimal(qty as any)));
            itemTags.set(part, 'WHOLE_CURRENT'); // Mark ownership
        };

        // 3. Aggregation Loop (Step 1)
        let total1phMeters = 0;
        let total3phMeters = 0;

        for (const meter of meterList) {
            const qty = Number(meter.quantity) || 0;
            if (meter.type === '100A wiring 3-phase') {
                total3phMeters += qty;
            } else if (meter.type === '100A wiring 1-phase') {
                total1phMeters += qty;
            }
        }

        // 4. Deterministic Derivation (Step 2)
        const totalMeters = total1phMeters + total3phMeters;
        const totalFuseQty = (total1phMeters * 1) + (total3phMeters * 3);

        console.log(`[Metering] Calculated Totals: 1ph=${total1phMeters}, 3ph=${total3phMeters}, Fuses=${totalFuseQty}`);

        const panelQty = config.bakeliteQty ?? totalMeters;

        if (totalMeters > 0 || panelQty > 0) {
            // Apply Derived Quantities
            // Panel & Links allow 1 per meter
            if (panelQty > 0) {
                addWc('100A-PANEL', panelQty);
                addWc('100A-NEUTRAL-LINK', panelQty);
            }

            // Fuses
            if (totalFuseQty > 0) addWc('100A-FUSE', totalFuseQty);

            // MCBs & Wiring (1ph)
            if (total1phMeters > 0) {
                addWc('100A-MCB-1PH', total1phMeters);
                addWc('100A-WIRING-1PH', total1phMeters);
            }

            // MCBs & Wiring (3ph)
            if (total3phMeters > 0) {
                addWc('100A-MCB-3PH', total3phMeters);
                addWc('100A-WIRING-3PH', total3phMeters);
            }
        }

        // 3a. Derived Chassis Logic (Step 3)
        // totalFuseQty is already calculated above
        // REMOVED: Soft-Cap/Error logic as per user request (2026-03-14)

        if (totalFuseQty > 6) {
            let fusesRemaining = totalFuseQty;
            console.log(`[Metering] Chassis Calculation for ${totalFuseQty} fuses.`);

            while (fusesRemaining > 0) {
                if (fusesRemaining > 24) {
                    addWc('100A-CHASSIS-30', 1);
                    fusesRemaining -= 30;
                } else if (fusesRemaining > 18) {
                    addWc('100A-CHASSIS-24', 1);
                    fusesRemaining -= 24;
                } else {
                    addWc('100A-CHASSIS-18', 1);
                    fusesRemaining -= 18;
                }
            }
        }

        // 4. Apply Totals to Target
        wcTotals.forEach((qty, part) => {
            addTarget(part, qty);
        });
    }

    // SCOPED CLEANUP: WHOLE_CURRENT
    const wcItemsToRemove = existingItems.filter((i: Item) =>
        i.systemTag === 'WHOLE_CURRENT' &&
        !itemTags.has(i.name) // If we didn't just tag it as WHOLE_CURRENT (or it's not in targets), remove it.
        // Wait, itemTags has BOTH CT and WC. 
        // We should check if it is in the CURRENT WC requirements.
        // We didn't keep 'wcTotals' exposed outside the block if inactive.
        // Logic:
        // If isWcActive is false, we want to remove ALL 'WHOLE_CURRENT' items.
        // If isWcActive is true, we remove 'WHOLE_CURRENT' items NOT in our calculated set.
    );

    // Filter clarification:
    // We want to delete i IF:
    // i.systemTag === 'WHOLE_CURRENT' AND i.name is NOT effectively required by WC logic.
    // If isWcActive is TRUE, we check against targets.
    // If isWcActive is FALSE, we delete everything.

    // Using targetItemPartNumbers is safe IF we assume no other logic adds these items.
    // But better to be explicit about "Did WC logic add this?".
    // Let's use a simpler check: 
    // Is it in target list? AND is strict tag match?
    // Note: if user manually added '100A-PANEL' (no tag), we don't touch it.
    // If CT logic added '100A-PANEL' (tag='CT'), we don't touch it here.
    // We only touch tag='WHOLE_CURRENT'.

    const wcCleanupList = existingItems.filter((i: Item) => {
        if (i.systemTag !== 'WHOLE_CURRENT') return false;
        // It IS a WC item. Keep it ONLY if it is in current targets.
        // (Since we just added all required WC items to targets)
        return !targetItemPartNumbers.has(i.name);
    });

    if (wcCleanupList.length > 0) {
        console.log(`[Metering] Cleaning up ${wcCleanupList.length} orphaned Whole Current items.`);
        await prisma.item.deleteMany({
            where: { id: { in: wcCleanupList.map(i => i.id) } }
        });
    }

    // F. "Meter Panel" Checkbox Legacy/Helper
    // If user clicked "Meter Panel" but is NOT in CT mode AND didn't select WC Metering.
    // This allows a standalone panel if explicitly requested as a pure fallback.
    // If either CT or WC is active, this must not exist.
    if (meterPanelSelected && !isCtMode && !isWcMode) {
        addTarget('100A-PANEL', ctQty); // Default to smaller panel if no rating/mode implies otherwise
        itemTags.set('100A-PANEL', 'METER_PANEL_FALLBACK'); // Explicit tag to allow deterministic cleanup
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
            if (isBusbar) {
                effectiveBusbarItems.set(item.name, {
                    qty: Number(item.quantity), // Convert Decimal to Number for logic math
                    price: item.unitPrice,
                    labour: item.labourHours,
                    category: item.category
                });
            }
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

    // --- CLEAT LOGIC (Universal Sync Participation) ---
    // Architecture Change: Cleats ALWAYS participate in sync (targets + removal).
    // Scope determines AUTHORITY (System vs User).

    // 1. Determine Scope
    const isCustom = config.enclosureType === 'Custom';
    const isForm3B = (config.form || '').toLowerCase() === '3b';
    const faultRatingStr = config.faultRating || '999';
    const faultkA = parseInt(faultRatingStr.replace(/[^0-9]/g, '') || '999');
    const isFaultSafe = faultkA <= 50;

    const managingCleats = isCustom && isForm3B && isFaultSafe;

    const CLEAT_ITEMS = [
        '1B1-CLEAT-SMALL-1',
        '1B1-CLEAT-SMALL-2',
        '1B1-CLEAT-LARGE-2',
        '1B1-CLEAT-LARGE-3'
    ];

    if (!managingCleats) {
        console.log(`[Cleats] Out of Scope (User Managed). Custom=${isCustom}, Form3B=${isForm3B}, Fault=${faultkA}kA`);
    }

    const cleatTargets = new Map<string, number>();

    // 2. Iterate Busbars to determine VALID cleats (Parent existence check)
    effectiveBusbarItems.forEach((val, key) => {
        // Extract rating from Part Number
        const ratingMatch = key.match(/-(\d+)A/);
        if (ratingMatch && ratingMatch[1]) {
            const rating = parseInt(ratingMatch[1]);
            const cleatType = getCleatType(rating);

            if (cleatType) {
                // We have a specialized cleat type needed for this busbar

                if (managingCleats) {
                    // SCOPE: IN (System Authority)
                    // Calculate Quantity
                    const lengthMm = val.qty * 1000;
                    let cleatQty = Math.ceil(lengthMm / 400) + 1;
                    if (lengthMm > 0 && cleatQty < 2) cleatQty = 2;

                    const currentTotal = cleatTargets.get(cleatType) || 0;
                    cleatTargets.set(cleatType, currentTotal + cleatQty);

                } else {
                    // SCOPE: OUT (User Authority)
                    // Preserve EXISTING Quantity if item exists.
                    // Do NOT auto-add if missing.
                    // Do NOT recalculate.

                    const existing = existingItems.find((i: Item) => i.name === cleatType);
                    if (existing) {
                        // User "Keep this" authority
                        // We sum up? No, existing item is unique per part number in this list context.
                        // But wait, we are iterating BUSBARS. Multiple busbars might map to same cleat type.
                        // Existing item quantity is the TOTAL for that part number.
                        // We simply need to ensure we mark this Part Number as "Targeted" once.

                        // If we haven't processed this cleatType yet, grab existing qty.
                        if (!cleatTargets.has(cleatType)) {
                            cleatTargets.set(cleatType, Number(existing.quantity));
                        }
                    }
                    // If not existing, we do NOTHING (don't auto-add).
                }
            }
        }
    });

    // 3. Apply Targets
    cleatTargets.forEach((qty, partNumber) => {
        if (managingCleats) {
            // Apply Overrides if System Managed
            if (cleatOverrides[partNumber] !== undefined) {
                addTarget(partNumber, cleatOverrides[partNumber]);
            } else {
                // Safeguard: Respect manual edit if item already exists on board
                const existing = existingItems.find((i: Item) => i.name === partNumber);
                if (existing) {
                    addTarget(partNumber, existing.quantity.toNumber());
                } else {
                    addTarget(partNumber, qty);
                }
            }
        } else {
            // User Managed: Trust the derived quantity (Existing).
            addTarget(partNumber, qty);
        }
    });

    // 4. Manual Cleat Preservation (User Authority Catch-All)
    // CRITICAL FIX: If !managingCleats, we must preserve ALL existing cleats,
    // even if they are orphaned (no parent busbar) and thus not found in step 2.
    if (!managingCleats) {
        existingItems.forEach((item: Item) => {
            if (CLEAT_ITEMS.includes(item.name)) {
                // Ensure we don't overwrite if already processed (though quantity should be same)
                if (!targetItemPartNumbers.has(item.name)) {
                    addTarget(item.name, Number(item.quantity));
                }
            }
        });
    }

    // --- 3. FETCH CATALOG DATA ---
    // We need catalog data BEFORE SS Calculation to properly price items like 1B-DOORS

    // Ensure 1A-COMPARTMENTS is targeted for Cubic before fetch
    if (config.enclosureType === 'Cubic') {
        targetItemPartNumbers.add('1A-COMPARTMENTS');
    }

    // New 2026-02-20: Ensure 1B-COMPARTMENTS is targeted for Custom before fetch
    if (config.enclosureType === 'Custom' && (config.totalCompartments || 0) > 0) {
        targetItemPartNumbers.add('1B-COMPARTMENTS');
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



    // --- 4.5 CUSTOM COMPARTMENTS LOGIC (New 2026-02-20) ---
    // If Custom board has compartments, add 1B-COMPARTMENTS with Qty = totalCompartments
    if (config.enclosureType === 'Custom' && (config.totalCompartments || 0) > 0) {
        const totalCompartments = config.totalCompartments || 0;
        const compartmentsItem = catalogMap.get('1B-COMPARTMENTS');
        const compartmentUnitPrice = compartmentsItem?.unitPrice || 0;

        if (compartmentsItem) {
            addTarget('1B-COMPARTMENTS', totalCompartments, compartmentUnitPrice);
        } else {
            console.warn('1B-COMPARTMENTS missing from catalog. Cannot price Custom compartments correctly.');
        }
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

    // --- EXTRA DOORS AUTOMATION ---
    console.log('\n--- EXTRA DOORS SYNC STARTED ---');
    let doorsChanged = false;
    if (config.enclosureType === 'Custom' && config.extraForDoorsOver === true && tierCount > 0) {
        const targetDoorQty = tierCount;
        const doorPart = '1B-DOORS';

        const existingDoor = existingItems.find(
            (i: Item) => i.partNumber === doorPart && (i as any).systemRuleType === 'EXTRA_DOORS'
        );

        if (existingDoor) {
            if (Number(existingDoor.quantity) !== targetDoorQty) {
                console.log(`[Extra Doors] Updating ${doorPart} qty to ${targetDoorQty}`);
                await prisma.item.update({
                    where: { id: existingDoor.id },
                    data: { quantity: targetDoorQty, cost: Number(existingDoor.unitPrice || 0) * targetDoorQty }
                });
                doorsChanged = true;
            }
        } else {
            console.log(`[Extra Doors] Creating new system-managed item for ${doorPart} with qty ${targetDoorQty}`);
            const catItem = await prisma.catalogItem.findFirst({
                where: { partNumber: doorPart }
            });
            if (catItem) {
                await prisma.item.create({
                    data: {
                        boardId,
                        category: catItem.category || 'Switchboard',
                        subcategory: catItem.subcategory || 'Sheetmetal',
                        name: catItem.partNumber || doorPart,
                        partNumber: doorPart,
                        description: catItem.description || 'Extra for Doors Over',
                        quantity: targetDoorQty,
                        unitPrice: catItem.unitPrice,
                        labourHours: catItem.labourHours,
                        cost: Number(catItem.unitPrice || 0) * targetDoorQty,
                        isSystemManaged: true,
                        isDefault: true,
                        systemTag: 'SHEETMETAL',
                        systemRuleType: 'EXTRA_DOORS',
                        notes: 'System Managed'
                    } as any
                });
                doorsChanged = true;
            } else {
                console.warn(`[Extra Doors] Missing catalog item for ${doorPart}`);
            }
        }
    } else {
        const doorsToRemove = existingItems.filter(
            (i: Item) => i.partNumber === '1B-DOORS' && (i as any).systemRuleType === 'EXTRA_DOORS'
        );
        if (doorsToRemove.length > 0) {
            console.log(`[Extra Doors] Removing ${doorsToRemove.length} orphaned rows`);
            await prisma.item.deleteMany({
                where: { id: { in: doorsToRemove.map((i: Item) => i.id) } }
            });
            doorsChanged = true;
        }
    }

    if (doorsChanged) {
        console.log('[Extra Doors] State mutated. Re-fetching existingItems from database.');
        const refreshedBoard = await prisma.board.findUnique({
            where: { id: boardId },
            include: { items: true }
        });
        if (refreshedBoard) {
            existingItems = refreshedBoard.items;
        }
    }
    // --- END EXTRA DOORS AUTOMATION ---

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
            const qty = targetQty !== undefined ? targetQty : (Number(existing?.quantity) || 0);

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
        '1B-600MM',
        '1B-800MM',
        '1B-COMPARTMENTS', // Explicitly managed now
        '1B-SS-2B', '1B-SS-NO4',
        ...CUBIC_OPTIONS_ITEMS,
        BUSBAR_INSULATION_ITEM,
        'MISC-SITE-RECONNECTION',
        'MISC-CABLE-TRAY',
        '1A-50KA',
        '1B1-CLEAT-SMALL-1',
        '1B1-CLEAT-SMALL-2',
        '1B1-CLEAT-LARGE-2',
        '1B1-CLEAT-LARGE-3',
    ];

    // NOTE: Removed 'finalManagedItems' filtering logic as Cleats now always participate in sync.
    // This allows them to be removed if orphaned (parent busbar removed) even when out of scope.

    const itemsToRemove = existingItems.filter((item: Item) =>
        (item.isDefault || CLEAT_ITEMS.includes(item.name)) && // Cleats must be removed if orphaned, even if released (isDefault=false)
        allManagedItems.includes(item.name) && // Cleats are always in here
        !targetItemPartNumbers.has(item.name) &&
        // PROTECT METERING ITEMS (systemTag-based exclusion)
        item.systemTag !== 'CT' &&
        item.systemTag !== 'WHOLE_CURRENT'
        // If Out-of-Scope and user removed busbar, 'targetItemPartNumbers' will NOT have the cleat (logic above).
        // So this will correctly remove it.
        // If Out-of-Scope and busbar exists, 'targetItemPartNumbers' WILL have the cleat (logic above).
        // So this will PRESERVE it.
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
        const rawTargetQty = itemQuantities.get(partNumber) || 1;
        const targetQty = Number(rawTargetQty); // Always sanitize to number for comparisons and DB save
        const targetPrice = customPricing.get(partNumber); // undefined if not custom
        const targetLabour = customLabour.get(partNumber);

        const isCleat = CLEAT_ITEMS.includes(partNumber);

        // Lookup: Loose lookup for Cleats (to allow re-acquisition), Strict for others (default)
        let existingItem: Item | undefined;

        if (isCleat) {
            // For cleats, we want to find ANY match to update it, regardless of lock state
            existingItem = existingItems.find((i: Item) => i.name === partNumber);
        } else {
            existingItem = existingItems.find((i: Item) => i.name === partNumber && i.isDefault);
        }

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

            if (existingItem.quantity.toNumber() !== newQty ||
                (Math.abs(existingItem.unitPrice - newUnitPrice) > 0.01) ||
                (Math.abs(existingItem.labourHours - newLabour) > 0.01) ||
                (forcedCategory && existingItem.category !== forcedCategory) ||
                (forcedSubcategory && existingItem.subcategory !== forcedSubcategory) ||
                (existingItem.isSheetmetal !== (catalogItem?.isSheetmetal || false)) ||
                // Trigger update if lock state mismatch for Cleats
                (isCleat && existingItem.isDefault !== managingCleats)) {

                // Clean Info Note if acquiring
                let newNotes = existingItem.notes;
                if (isCleat && managingCleats) {
                    newNotes = newNotes?.replace(/\n\[INFO\] Cleat automation applies up to 50kA\..*/g, '') || null;
                } else if (isCleat && !managingCleats && !newNotes?.includes('[INFO]')) {
                    // Add Note if releasing (should have been handled? No, we might be transitioning)
                    newNotes = (newNotes || '') + '\n[INFO] Cleat automation applies up to 50kA. Above this rating, cleats are fully manual and must be reviewed by engineering.';
                }

                if (catalogItem && catalogItem.isCopperPriced) {
                    const dynamicCalc = calculateBusbarUnitPrice(catalogItem as any, pricingContext);
                    newUnitPrice = Number(dynamicCalc);
                }

                await prisma.item.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: newQty,
                        unitPrice: newUnitPrice,
                        labourHours: newLabour,
                        cost: newUnitPrice * newQty,
                        category: forcedCategory || existingItem.category, // Enforce basics/busbar if needed
                        subcategory: forcedSubcategory || existingItem.subcategory,
                        isSheetmetal: catalogItem?.isSheetmetal || false,

                        // Dynamic Locking
                        isDefault: isCleat ? false : true,
                        isSystemManaged: isCleat ? false : existingItem.isSystemManaged, // Don't touch others
                        systemTag: itemTags.get(partNumber) || existingItem.systemTag || null, // Persist CT/WC tag
                        notes: newNotes
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

            if (catalogItem && catalogItem.isCopperPriced) {
                const dynamicCalc = calculateBusbarUnitPrice(catalogItem as any, pricingContext);
                finalUnitPrice = Number(dynamicCalc);
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
                    isDefault: isCleat ? false : true,
                    isSheetmetal: catalogItem?.isSheetmetal || false,
                    systemTag: itemTags.get(partNumber) || null // Persist CT/WC tag
                }
            });
        }
    }));
}
