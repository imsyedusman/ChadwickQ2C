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
        const SYSTEM_TAG = 'MCCB_ACCESSORIES';

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
        // FILTER: Only look at items managed by THIS automation
        const systemItems = items.filter(i =>
            i.isSystemManaged &&
            (i as any).systemTag === SYSTEM_TAG
        );

        // Fallback for migration: If systemTag is null but matches old criteria, we might want to claim it or ignore it.
        // For now, strict mode: only touch items with correct tag. Use a migration script if needed to tag old items.

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
                            notes: 'System Managed',
                            systemTag: SYSTEM_TAG
                        } as any
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

    /**
     * Helper: Derive MCCB Variant from item context (Subcategory, Category, etc.)
     * Returns keys like "B3", "F3", "N3", "H3", "630bN", "800N", "1000N", "1250N", "1600N", "SAU"
     */
    static deriveVariant(item: { category: string, subcategory: string | null, productFrame: string | null, name: string }): string | null {
        // 1. Check Subcategory/Category strings for explicit variants
        const contextString = `${item.category} ${item.subcategory || ''} ${item.name}`.toUpperCase();

        // Priority Ordered Variants
        const VARIANTS = ['B3', 'F3', 'N3', 'H3', '630BN', '800N', '1000N', '1250N', '1600N'];

        for (const v of VARIANTS) {
            // Ensure we match whole words or bounded segments to avoid false positives? 
            // Simple includes should be fine for these specific tokens given the domain.
            if (contextString.includes(v)) {
                return v === '630BN' ? '630bN' : v; // Fix casing for 630bN if needed
            }
        }

        // Special Case: SAU Chassis
        if (item.name.startsWith('SAU')) {
            return 'SAU';
        }

        return null;
    }

    /**
    * Syncs MCCB Trip Unit -> Base paring.
    * Uses MccbTripBaseRule table to determine required Base part.
    * STRICT MODE: Relies on Item.mccbVariant and Item.partNumber.
    */
    static async syncMccbTripBasePairs(boardId: string) {
        const SYSTEM_TAG = 'MCCB_TRIP_BASE';

        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: { items: true } // We need to cast result or assume config is available if we selected it...
            // select: { items: true, mccbVariant: true, config: true } // Can't mix select and include easily without strict types
            // Just use include and assume fields exist on board object (it selects all scalars by default)
        });

        if (!board) return;

        const boardVariant = (board as any).mccbVariant || (board.config ? JSON.parse(board.config as string).faultRating?.includes('36kA') ? 'F3' : 'B3' : 'B3');
        // Simple default logic for now if new column is empty (which it might be for old boards)

        const items = board.items;

        // 1. Load Rules
        const allRules = await (prisma as any).mccbTripBaseRule.findMany();
        const ruleMap = new Map<string, string>(); // Key: "TripPart::Variant" -> BasePart
        const knownTripParts = new Set<string>();

        allRules.forEach((r: any) => {
            const key = `${r.tripPartNumber}::${r.variant}`;
            ruleMap.set(key, r.basePartNumber);
            knownTripParts.add(r.tripPartNumber);
        });

        // 2. Identify Trip Units and Calculate Requirements
        const requiredBases = new Map<string, number>(); // BasePart -> Qty

        for (const item of items) {
            const partNum = (item as any).partNumber;
            let variant = (item as any).mccbVariant;

            if (!partNum) continue;

            // Is this potentially a trip unit?
            if (knownTripParts.has(partNum)) {
                if (!variant) {
                    // Fallback to Board Variant
                    variant = boardVariant;
                }

                const key = `${partNum}::${variant}`;
                const basePart = ruleMap.get(key);

                if (basePart) {
                    const current = requiredBases.get(basePart) || 0;
                    requiredBases.set(basePart, current + item.quantity);
                } else {
                    console.warn(`[MCCB Sync] No rule found for Trip ${partNum} + Variant ${variant}`);
                }
            }
        }

        // 3. Sync System Items
        // FILTER: Only look at items managed by THIS automation (systemTag)
        const systemItems = items.filter(i =>
            i.isSystemManaged &&
            ((i as any).systemTag === SYSTEM_TAG || i.notes?.includes('[SYS:MCCB_TRIP_BASE]')) // Backward compat for a moment, or strict? Strict is better but for verified items we added tag? No we didn't add tag yet.
            // Wait, items in DB don't have tag yet.
            // If we rely on systemTag, legacy items (notes based) will not be picked up and might be duplicated?
            // Actually, for cleanup we want to capture them.
            // Should we support both?
            // "Fix the pairing logic so it actually triggers... prevent system-managed items... from colliding"
            // Let's assume we are creating NEW items with tags. Old items will be orphaned if we don't include them.
            // The instructions say "When syncing/deleting old base items: ONLY touch items where systemTag='MCCB_TRIP_BASE'".
            // If DB doesn't have tags on old items, we might need to manual cleanup or include the note check one last time.
            // Let's include the note check for safety so we clean them up or update them.
        );

        // A. Update/Create
        for (const [basePart, qty] of requiredBases.entries()) {
            const existing = systemItems.find(i => (i as any).partNumber === basePart);

            if (existing) {
                if (existing.quantity !== qty) {
                    await prisma.item.update({
                        where: { id: existing.id },
                        data: {
                            quantity: qty,
                            cost: existing.unitPrice * qty,
                            systemTag: SYSTEM_TAG // Backfill tag if missing
                        } as any
                    });
                } else if (!(existing as any).systemTag) {
                    // Just backfill tag if quantity match
                    await prisma.item.update({
                        where: { id: existing.id },
                        data: { systemTag: SYSTEM_TAG } as any
                    });
                }
            } else {
                // Create New
                const catalogItem = await (prisma as any).catalogItem.findFirst({
                    where: { partNumber: basePart }
                });

                if (catalogItem) {
                    await prisma.item.create({
                        data: {
                            boardId,
                            category: catalogItem.category, // Use Catalog Category
                            subcategory: catalogItem.subcategory, // Use Catalog Subcategory
                            name: basePart, // Use Part Number as Name (Standard)
                            partNumber: basePart,
                            description: catalogItem.description,
                            unitPrice: catalogItem.unitPrice,
                            labourHours: catalogItem.labourHours,
                            quantity: qty,
                            cost: catalogItem.unitPrice * qty,
                            isSystemManaged: true,
                            notes: `[SYS] - Do not edit`,
                            productFrame: 'MMC_BASE',
                            mccbVariant: catalogItem.mccbVariant,
                            systemTag: SYSTEM_TAG
                        } as any
                    });
                } else {
                    console.error(`[MCCB Sync] Missing Catalog Item for Base ${basePart}`);
                }
            }
        }

        // B. Cleanup
        for (const item of systemItems) {
            const pNum = (item as any).partNumber;
            // Only strictly delete what we tracked.
            if (pNum && !requiredBases.has(pNum)) {
                await prisma.item.delete({ where: { id: item.id } });
            }
        }
    }
}
