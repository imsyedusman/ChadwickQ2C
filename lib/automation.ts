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

        const ACCESSORY_SKUS = new Set<string>(
            Object.values(ACCESSORY_MAP).flatMap(g => [g.shield, g.handle])
        );

        for (const item of items) {
            // Must be a breaker:
            // 1. Not system managed
            // 2. Has a productFrame
            // 3. Not an accessory SKU (double safety)
            // 4. Not in 'MCCB Accessories' subcategory (triple safety)
            // 5. Explicit check to ensure we don't count accessories even if they have frames
            const isBreaker = !item.isSystemManaged
                && item.productFrame
                && !ACCESSORY_SKUS.has(item.name)
                && item.subcategory !== 'MCCB Accessories';

            if (isBreaker && item.productFrame && item.productFrame in frameCounts) {
                frameCounts[item.productFrame as FrameType] += item.quantity;
            }
        }

        // 3. Calculate Required Accessories
        // Map: Key (SKU + Frame) -> { quantity: number, frame: string, sku: string }
        // We need unique keys because different frames might potentially share SKUs (though currently they don't seem to)
        // But user requirement "4 system-managed accessory lines total (2 per frame)" implies separation by frame.
        const requirements: Record<string, { quantity: number, frame: string, sku: string }> = {};

        for (const [frame, qty] of Object.entries(frameCounts)) {
            if (qty > 0) {
                const map = ACCESSORY_MAP[frame as FrameType];

                // Rules:
                // Terminal Shield = 2 * Breaker Qty
                // Rotary Handle = 1 * Breaker Qty

                const addReq = (sku: string, q: number, frm: string) => {
                    // Key must be unique combinaison of SKU + Frame
                    const key = `${sku}::${frm}`;
                    if (!requirements[key]) {
                        requirements[key] = { quantity: 0, frame: frm, sku: sku };
                    }
                    requirements[key].quantity += q;
                };

                addReq(map.shield, qty * 2, frame);
                addReq(map.handle, qty, frame);
            }
        }

        // 4. Sync with Database
        // We only touch items that are "System Managed" (isSystemManaged = true)

        // Find existing system-managed accessories on the board
        const systemItems = items.filter(i => i.isSystemManaged);

        // A. Update or Create Logic
        for (const req of Object.values(requirements)) {
            // STRICT Match: Same Board (implicit), Same SKU, Same Frame
            const matchingItems = systemItems.filter(i =>
                i.name === req.sku &&
                i.productFrame === req.frame
            );

            const primaryItem = matchingItems[0];
            const duplicates = matchingItems.slice(1);

            // 1. Handle Duplicates: Delete them immediately
            for (const dup of duplicates) {
                await prisma.item.delete({ where: { id: dup.id } });
                console.warn(`[Automation] Removed duplicate accessory ${dup.name} (${dup.productFrame})`);
            }

            if (primaryItem) {
                // Update if quantity changed
                if (primaryItem.quantity !== req.quantity) {
                    await prisma.item.update({
                        where: { id: primaryItem.id },
                        data: { quantity: req.quantity, cost: primaryItem.unitPrice * req.quantity }
                    });
                    console.log(`[Automation] Updated ${req.sku} (${req.frame}) to qty ${req.quantity}`);
                }
            } else {
                // Create new
                // Need to fetch details from CatalogItem first to get Price/Desc
                const catalogItem = await prisma.catalogItem.findFirst({
                    where: { partNumber: req.sku }
                });

                if (catalogItem) {
                    await prisma.item.create({
                        data: {
                            boardId,
                            category: 'Switchboard',
                            subcategory: 'MCCB Accessories',
                            name: req.sku, // Store SKU in name
                            description: catalogItem.description,
                            unitPrice: catalogItem.unitPrice,
                            labourHours: catalogItem.labourHours,
                            quantity: req.quantity,
                            cost: catalogItem.unitPrice * req.quantity,
                            isSystemManaged: true,
                            isDefault: true,
                            productFrame: req.frame, // Store the frame that triggered this
                            notes: 'System Managed'
                        }
                    });
                    console.log(`[Automation] Created ${req.sku} (${req.frame}) qty ${req.quantity}`);
                } else {
                    console.error(`[Automation] CRITICAL: Missing catalog item for accessory SKU: ${req.sku}. Check catalog data.`);
                    // Do NOT create fake item - strict guardnail
                }
            }
        }

        // B. Cleanup Logic
        // Delete any system-managed item that is NOT in our requirements list anymore
        // (i.e. breaker count went to 0, or frame changed)
        for (const item of systemItems) {
            // Check if this item matches any requirement
            // Match Key = SKU + Frame
            // If item has no productFrame, it might be legacy or broken. If we can't map it to a requirement, we delete it.

            // We reconstruct the key that WOULD produce this item
            const frame = item.productFrame || '';
            const sku = item.name;
            const key = `${sku}::${frame}`;

            const isRequired = requirements[key];

            if (!isRequired) {
                await prisma.item.delete({
                    where: { id: item.id }
                });
                console.log(`[Automation] Removed unused accessory ${sku} (${frame || 'no-frame'})`);
            }
        }
    }
}
