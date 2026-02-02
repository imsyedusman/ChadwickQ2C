import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Accessory SKUs
const ACCESSORY_MAP = {
    'NSX100-250': {
        shield: 'LV429517',
        handle: 'LV429338T'
    },
    'NSX400-630': {
        shield: 'LV432593',
        handle: 'LV432598T'
    },
    'NS630b-1600': {
        shield: '33628',
        handle: '33873'
    }
} as const;

type FrameType = keyof typeof ACCESSORY_MAP;

export class AutomationService {

    /**
     * Syncs MCCB accessories for a given board based on selected breakers.
     * Call this whenever an ITEM is added/updated/deleted on a board.
     */
    static async syncBoardAccessories(boardId: string) {
        // 1. Fetch all items on the board
        const items = await prisma.item.findMany({
            where: { boardId }
        });

        // 2. Group Breakers by Frame (only items with a productFrame set)
        // CRITICAL: Exclude system-managed items and accessories from this count to prevent runaway loops.
        const frameCounts: Record<FrameType, number> = {
            'NSX100-250': 0,
            'NSX400-630': 0,
            'NS630b-1600': 0
        };

        const ACCESSORY_SKUS = new Set(
            Object.values(ACCESSORY_MAP).flatMap(g => [g.shield, g.handle])
        );

        for (const item of items) {
            // Must be a breaker:
            // 1. Not system managed
            // 2. Has a productFrame
            // 3. Not an accessory SKU (double safety)
            // 4. Not in 'MCCB Accessories' subcategory (triple safety)
            const isBreaker = !item.isSystemManaged
                && item.productFrame
                && !ACCESSORY_SKUS.has(item.name)
                && item.subcategory !== 'MCCB Accessories';

            if (isBreaker && item.productFrame && item.productFrame in frameCounts) {
                frameCounts[item.productFrame as FrameType] += item.quantity;
            }
        }

        // 3. Calculate Required Accessories
        // Map: SKU -> { quantity: number, frame: string }
        const requirements: Record<string, { quantity: number, frame: string }> = {};

        for (const [frame, qty] of Object.entries(frameCounts)) {
            if (qty > 0) {
                const map = ACCESSORY_MAP[frame as FrameType];

                // Rules:
                // Terminal Shield = 2 * Breaker Qty
                // Rotary Handle = 1 * Breaker Qty

                // Helper to add req
                const addReq = (sku: string, q: number) => {
                    if (!requirements[sku]) {
                        requirements[sku] = { quantity: 0, frame };
                    }
                    requirements[sku].quantity += q;
                };

                addReq(map.shield, qty * 2);
                addReq(map.handle, qty);
            }
        }

        // 4. Sync with Database
        // We only touch items that are "System Managed" (isSystemManaged = true)

        // Find existing system-managed accessories on the board
        const systemItems = items.filter(i => i.isSystemManaged);

        // A. Update or Create Logic
        for (const [sku, req] of Object.entries(requirements)) {
            const existing = systemItems.find(i => i.name === sku); // Matching by Name/PartNumber

            if (existing) {
                // Update if quantity changed
                if (existing.quantity !== req.quantity) {
                    await prisma.item.update({
                        where: { id: existing.id },
                        data: { quantity: req.quantity, cost: existing.unitPrice * req.quantity }
                    });
                    console.log(`[Automation] Updated ${sku} to qty ${req.quantity}`);
                }
            } else {
                // Create new
                // Need to fetch details from CatalogItem first to get Price/Desc
                const catalogItem = await prisma.catalogItem.findFirst({
                    where: { partNumber: sku }
                });

                if (catalogItem) {
                    await prisma.item.create({
                        data: {
                            boardId,
                            category: 'Switchboard', // Defined in requirements
                            subcategory: 'MCCB Accessories', // Defined in requirements
                            name: sku,
                            description: catalogItem.description,
                            unitPrice: catalogItem.unitPrice,
                            labourHours: catalogItem.labourHours, // Use catalog hours
                            quantity: req.quantity,
                            cost: catalogItem.unitPrice * req.quantity,
                            isSystemManaged: true,
                            isDefault: true,
                            productFrame: req.frame, // Store the frame that triggered this
                            notes: 'System Managed'
                        }
                    });
                    console.log(`[Automation] Created ${sku} qty ${req.quantity}`);
                } else {
                    console.warn(`[Automation] Missing catalog item for accessory SKU: ${sku}`);
                    // Fallback create minimal item? No, safer to skip to avoid bad data.
                }
            }
        }

        // B. Cleanup Logic
        // Delete any system-managed item that is NOT in our requirements list anymore
        // (i.e. breaker count went to 0)
        for (const item of systemItems) {
            // Check if this item's name (SKU) is in requirements
            const isRequired = item.name in requirements;

            if (!isRequired) {
                await prisma.item.delete({
                    where: { id: item.id }
                });
                console.log(`[Automation] Removed unused accessory ${item.name}`);
            }
        }
    }
}
