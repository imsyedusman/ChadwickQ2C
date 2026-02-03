import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Accessory SKUs Configuration
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

// Helper: Identify Accessory Type and Frame from SKU
export type AccessoryType = 'HANDLE' | 'SHIELD' | 'NONE';

export const getAccessoryType = (sku: string): AccessoryType => {
    // Handles
    if (['LV429338T', 'LV432598T', '33873'].includes(sku)) return 'HANDLE';
    // Shields
    if (['LV429517', 'LV432593', '33628'].includes(sku)) return 'SHIELD';
    return 'NONE';
};

export const getAccessoryFrame = (sku: string): FrameType | null => {
    // Reverse lookup from ACCESSORY_MAP
    for (const [frame, map] of Object.entries(ACCESSORY_MAP)) {
        if (map.handle === sku || map.shield === sku) {
            return frame as FrameType;
        }
    }
    return null;
};

export class AutomationService {

    /**
     * Syncs MCCB accessories for a given board based on selected breakers.
     * Call this whenever an ITEM is added/updated/deleted on a board.
     */
    static async syncBoardAccessories(boardId: string) {
        // 1. Fetch Board and Items to check settings
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: { quote: true, items: true }
        });

        if (!board) return;

        const items = board.items;

        // Load Overrides from Quote Settings
        let overrides: any = {};
        if (board.quote?.settingsSnapshot) {
            try {
                const settings = JSON.parse(board.quote.settingsSnapshot);
                if (settings.mccbOverrides && settings.mccbOverrides[boardId]) {
                    overrides = settings.mccbOverrides[boardId];
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        const disabledHandleFrames: string[] = overrides.disableRotaryHandleFrames || [];

        // 2. Group Breakers by Frame (only items with a productFrame set)
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
            const isBreaker = !item.isSystemManaged
                && item.productFrame
                && !ACCESSORY_SKUS.has(item.name)
                && item.subcategory !== 'MCCB Accessories';

            if (isBreaker && item.productFrame && item.productFrame in frameCounts) {
                frameCounts[item.productFrame as FrameType] += item.quantity;
            }
        }

        // 3. Calculate Required Accessories
        const requirements: Record<string, { quantity: number, frame: string, sku: string }> = {};

        for (const [frame, qty] of Object.entries(frameCounts)) {
            if (qty > 0) {
                const map = ACCESSORY_MAP[frame as FrameType];

                const addReq = (sku: string, q: number, frm: string) => {
                    const key = `${sku}::${frm}`;
                    if (!requirements[key]) {
                        requirements[key] = { quantity: 0, frame: frm, sku: sku };
                    }
                    requirements[key].quantity += q;
                };

                // Add Shield (Always)
                addReq(map.shield, qty * 2, frame);

                // Add Handle (Unless overridden)
                // Override Rule: "If override says disabled, do not create it"
                // Currently only applies to NSX100-250 but generic check is safer
                const isHandleDisabled = disabledHandleFrames.includes(frame);

                if (!isHandleDisabled) {
                    addReq(map.handle, qty, frame);
                } else {
                    console.log(`[Automation] Skipping handle for ${frame} due to override.`);
                }
            }
        }

        // 4. Sync with Database
        const systemItems = items.filter(i => i.isSystemManaged);

        // A. Update or Create Logic
        for (const req of Object.values(requirements)) {
            const matchingItems = systemItems.filter(i =>
                i.name === req.sku &&
                i.productFrame === req.frame
            );

            const primaryItem = matchingItems[0];
            const duplicates = matchingItems.slice(1);

            // 1. Handle Duplicates
            for (const dup of duplicates) {
                await prisma.item.delete({ where: { id: dup.id } });
            }

            if (primaryItem) {
                if (primaryItem.quantity !== req.quantity) {
                    await prisma.item.update({
                        where: { id: primaryItem.id },
                        data: { quantity: req.quantity, cost: primaryItem.unitPrice * req.quantity }
                    });
                }
            } else {
                // Create new
                const catalogItem = await prisma.catalogItem.findFirst({
                    where: { partNumber: req.sku }
                });

                if (catalogItem) {
                    await prisma.item.create({
                        data: {
                            boardId,
                            category: 'Switchboard',
                            subcategory: 'MCCB Accessories',
                            name: req.sku,
                            description: catalogItem.description,
                            unitPrice: catalogItem.unitPrice,
                            labourHours: catalogItem.labourHours,
                            quantity: req.quantity,
                            cost: catalogItem.unitPrice * req.quantity,
                            isSystemManaged: true,
                            isDefault: true,
                            productFrame: req.frame,
                            notes: 'System Managed'
                        }
                    });
                }
            }
        }

        // B. Cleanup Logic
        // Delete any system-managed item that is NOT in our requirements list anymore
        for (const item of systemItems) {
            const frame = item.productFrame || '';
            const sku = item.name;
            const key = `${sku}::${frame}`;

            // Check if this item is required
            const isRequired = requirements[key];

            if (!isRequired) {
                // If it's not required, it might be because:
                // 1. Breakers removed (frame count 0)
                // 2. Override active (requirements didn't include it)
                // In both cases, we delete it.
                await prisma.item.delete({
                    where: { id: item.id }
                });
            }
        }
    }
}
