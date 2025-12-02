
import prisma from '@/lib/prisma';

interface BoardConfig {
    ctMetering: string;
    ctType?: string;
    ctQuantity?: number;
    meterPanel: string;
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

export async function syncBoardItems(boardId: string, config: BoardConfig) {
    console.log(`Syncing items for board ${boardId} with config:`, config);

    // 1. Identify Target Items based on Config
    const targetItemPartNumbers = new Set<string>();
    const itemQuantities = new Map<string, number>();

    // Helper to add target item
    const addTarget = (partNumber: string, qty: number) => {
        targetItemPartNumbers.add(partNumber);
        itemQuantities.set(partNumber, qty);
    };

    const ctQty = config.ctQuantity || 1;

    if (config.ctMetering === 'Yes') {
        // Base Items
        CT_BASE_ITEMS.forEach(pn => addTarget(pn, ctQty));

        // Type Item
        if (config.ctType) {
            addTarget(`CT-${config.ctType}-TYPE`, ctQty);
        }
    }

    if (config.meterPanel === 'Yes') {
        // Meter Panel Items
        METER_PANEL_ITEMS.forEach(pn => addTarget(pn, ctQty));
    }

    const targetPartNumbersArray = Array.from(targetItemPartNumbers);

    if (targetPartNumbersArray.length === 0) {
        // If no auto items needed, just remove any existing auto-items that belong to this logic
        const allPotentialItems = [
            ...CT_BASE_ITEMS,
            ...METER_PANEL_ITEMS,
            'CT-S-TYPE', 'CT-T-TYPE', 'CT-W-TYPE', 'CT-U-TYPE'
        ];

        // Remove all auto-added items that match these part numbers
        await prisma.item.deleteMany({
            where: {
                boardId,
                isDefault: true,
                name: { in: allPotentialItems }
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

    // 3. Fetch Existing Board Items
    const existingItems = await prisma.item.findMany({
        where: {
            boardId
        }
    });

    // 4. Sync Logic

    // A. Remove items that are in our "Potential List" but NOT in "Target List" AND are isDefault=true
    const allPotentialItems = [
        ...CT_BASE_ITEMS,
        ...METER_PANEL_ITEMS,
        'CT-S-TYPE', 'CT-T-TYPE', 'CT-W-TYPE', 'CT-U-TYPE'
    ];

    const itemsToRemove = existingItems.filter((item: any) =>
        item.isDefault &&
        allPotentialItems.includes(item.name) &&
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
