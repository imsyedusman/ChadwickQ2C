
import prisma from '@/lib/prisma';

interface BoardConfig {
    ctMetering: string;
    ctType?: string;
    ctQuantity?: number;
    meterPanel: string;
    wholeCurrentMetering?: string;
    wcType?: string;
    wcQuantity?: number;
    tierCount?: number;
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

// Tier items - source of truth for tier count
const TIER_ITEMS = ['1A-TIERS', '1B-TIERS-400'];

// MISC items that scale with tier count
const MISC_TIER_ITEMS = ['MISC-LABELS', 'MISC-HARDWARE'];

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


export async function syncBoardItems(boardId: string, config: BoardConfig) {
    console.log(`Syncing items for board ${boardId} with config:`, JSON.stringify(config, null, 2));

    // 1. Identify Target Items based on Config
    const targetItemPartNumbers = new Set<string>();
    const itemQuantities = new Map<string, number>();

    // Helper to add target item
    const addTarget = (partNumber: string, qty: number) => {
        console.log(`Adding target: ${partNumber}, qty: ${qty}`);
        targetItemPartNumbers.add(partNumber);
        // If item already exists, use the larger quantity (e.g. if shared)
        const currentQty = itemQuantities.get(partNumber) || 0;
        if (qty > currentQty) {
            itemQuantities.set(partNumber, qty);
        }
    };

    const ctQty = config.ctQuantity || 1;

    if (config.ctMetering === 'Yes') {
        // Base Items
        CT_BASE_ITEMS.forEach(pn => addTarget(pn, ctQty));

        // Type Item
        if (config.ctType) {
            addTarget(`CT-${config.ctType}-TYPE`, ctQty);
        }

        // NEW: Add 1M Busbar based on Current Rating and Enclosure Type
        if (config.currentRating && config.enclosureType) {
            const busbarPartNumber = getBusbarPartNumber(config.currentRating, config.enclosureType);
            if (busbarPartNumber) {
                addTarget(busbarPartNumber, ctQty);
            }
        }

        // NEW: Add CT Chamber Labour based on Current Rating
        if (config.currentRating) {
            const labourPartNumber = getLabourPartNumber(config.currentRating);
            if (labourPartNumber) {
                addTarget(labourPartNumber, ctQty);
            }
        }
    }


    if (config.meterPanel === 'Yes') {
        // Meter Panel Items
        METER_PANEL_ITEMS.forEach(pn => addTarget(pn, ctQty));
    }


    // Whole-Current Metering Logic
    if (config.wholeCurrentMetering === 'Yes') {
        const wcQty = config.wcQuantity || 1;

        if (config.wcType === '100A wiring 3-phase') {
            // 3-phase kit
            addTarget('100A-FUSE', wcQty * 3);  // 3 fuses per meter
            addTarget('100A-PANEL', wcQty);
            addTarget('100A-NEUTRAL-LINK', wcQty);
            addTarget('100A-MCB-3PH', wcQty);
        } else if (config.wcType === '100A wiring 1-phase') {
            // 1-phase kit
            addTarget('100A-FUSE', wcQty);  // 1 fuse per meter
            addTarget('100A-PANEL', wcQty);
            addTarget('100A-NEUTRAL-LINK', wcQty);
            addTarget('100A-MCB-1PH', wcQty);
        }
    }

    // --- TIER & DELIVERY LOGIC ---  
    // CRITICAL: This must execute BEFORE the early return check below
    console.log('=== TIER LOGIC DEBUG ===');
    console.log('Config received:', JSON.stringify(config, null, 2));
    console.log('config.tierCount:', config.tierCount);
    console.log('config.enclosureType:', config.enclosureType);

    // Fetch existing items NOW (before tier logic) so we can use fallback
    const existingItems = await prisma.item.findMany({
        where: { boardId }
    });

    // Primary source: config.tierCount (from Pre-Selection Wizard)
    // Fallback: derive from existing tier items if config.tierCount is missing/0
    let tierCount = config.tierCount || 0;

    // Fallback detection: check if tier items exist on the board
    if (tierCount === 0) {
        const tier1A = existingItems.find((item: any) => item.name === '1A-TIERS');
        const tier1B = existingItems.find((item: any) => item.name === '1B-TIERS-400');

        if (tier1A) {
            tierCount = tier1A.quantity;
            console.log('Fallback: Derived tierCount from 1A-TIERS:', tierCount);
        } else if (tier1B) {
            tierCount = tier1B.quantity;
            console.log('Fallback: Derived tierCount from 1B-TIERS-400:', tierCount);
        } else {
            console.log('No tier count in config and no tier items found');
        }
    } else {
        console.log('Using tierCount from config:', tierCount);
    }

    // 1. Manage Tier Item based on enclosure type
    if (tierCount > 0) {
        if (config.enclosureType === 'Cubic') {
            console.log('Adding target: 1A-TIERS qty', tierCount);
            addTarget('1A-TIERS', tierCount);
        } else {
            console.log('Adding target: 1B-TIERS-400 qty', tierCount, '(enclosureType:', config.enclosureType, ')');
            addTarget('1B-TIERS-400', tierCount);
        }
    } else {
        console.log('tierCount is 0, no tier items will be added');
    }

    // 2. Manage MISC Items based on tierCount
    if (tierCount > 0) {
        // Labels and hardware scale with tier count
        console.log('Adding MISC items: LABELS, HARDWARE qty', tierCount);
        addTarget('MISC-LABELS', tierCount);
        addTarget('MISC-HARDWARE', tierCount);

        // Delivery based on tier count
        if (tierCount === 1) {
            console.log('Adding delivery: MISC-DELIVERY-UTE');
            addTarget('MISC-DELIVERY-UTE', 1);
        } else if (tierCount > 1) {
            console.log('Adding delivery: MISC-DELIVERY-HIAB');
            addTarget('MISC-DELIVERY-HIAB', 1);
        }
    } else {
        console.log('tierCount is 0, no MISC items will be added');
    }
    console.log('=== END TIER LOGIC ===');

    const targetPartNumbersArray = Array.from(targetItemPartNumbers);

    if (targetPartNumbersArray.length === 0) {
        // If no auto items needed, just remove any existing auto-items that belong to this logic
        const allPotentialItems = [
            ...CT_BASE_ITEMS,
            ...METER_PANEL_ITEMS,
            ...WC_KIT_ITEMS,
            'CT-S-TYPE', 'CT-T-TYPE', 'CT-W-TYPE', 'CT-U-TYPE'
        ];

        // Remove all auto-added items (including busbars and labour)
        await prisma.item.deleteMany({
            where: {
                boardId,
                isDefault: true,
                OR: [
                    { name: { in: allPotentialItems } },
                    { name: { startsWith: 'BB-' } },
                    { name: { startsWith: 'BBC-' } },
                    { name: { startsWith: 'CT-', endsWith: 'A' } }
                ]
            }
        });
        return;
    }

    // 2. Fetch Catalog Details for Target Items
    const catalogItems = await prisma.catalogItem.findMany({
        where: {
            partNumber: { in: targetPartNumbersArray }
        }
    });

    const catalogMap = new Map<string, CatalogItem>();
    catalogItems.forEach((i: any) => {
        if (i.partNumber) catalogMap.set(i.partNumber, i);
    });


    // 4. Sync Logic

    // A. Remove items that are in our "Potential List" but NOT in "Target List" AND are isDefault=true
    const allPotentialItems = [
        ...CT_BASE_ITEMS,
        ...METER_PANEL_ITEMS,
        ...WC_KIT_ITEMS,
        'CT-S-TYPE', 'CT-T-TYPE', 'CT-W-TYPE', 'CT-U-TYPE',
        ...MISC_TIER_ITEMS,
        ...MISC_DELIVERY_ITEMS,
        ...TIER_ITEMS
    ];

    // Helper to check if item is a busbar or labour item
    const isBusbarOrLabour = (name: string) => {
        return name.startsWith('BB-') || name.startsWith('BBC-') ||
            (name.startsWith('CT-') && name.endsWith('A'));
    };

    const itemsToRemove = existingItems.filter((item: any) =>
        item.isDefault &&
        (allPotentialItems.includes(item.name) || isBusbarOrLabour(item.name)) &&
        !targetItemPartNumbers.has(item.name)
    );

    if (itemsToRemove.length > 0) {
        await prisma.item.deleteMany({
            where: {
                id: { in: itemsToRemove.map((i: any) => i.id) }
            }
        });
    }

    // B. Add or Update Target Items
    for (const partNumber of targetPartNumbersArray) {
        const catalogItem = catalogMap.get(partNumber);
        if (!catalogItem) {
            console.warn(`Catalog item not found for ${partNumber}`);
            continue;
        }

        const targetQty = itemQuantities.get(partNumber) || 1;
        const existingItem = existingItems.find((i: any) => i.name === partNumber && i.isDefault);

        if (existingItem) {
            // Update if quantity changed
            if (existingItem.quantity !== targetQty) {
                await prisma.item.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: targetQty,
                        cost: existingItem.unitPrice * targetQty
                    }
                });
            }
        } else {
            // Add new item
            await prisma.item.create({
                data: {
                    boardId,
                    category: catalogItem.category || 'Basics',
                    subcategory: catalogItem.subcategory,
                    name: catalogItem.partNumber || partNumber,
                    description: catalogItem.description,
                    unitPrice: catalogItem.unitPrice,
                    labourHours: catalogItem.labourHours,
                    quantity: targetQty,
                    cost: catalogItem.unitPrice * targetQty,
                    isDefault: true
                }
            });
        }
    }
}
