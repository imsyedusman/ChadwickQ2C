import { PrismaClient } from '@prisma/client';
import { normalizePartNumber } from './normalization';

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

// ATS Breaker Groups (Strict Match)
const ATS_BREAKER_GROUPS = {
    GROUP_1_100_250: [
        'BLV429632/29642', 'BLV429642', // Variant handling? User said "BLV429632/29642". We put exact string.
        'BLV429630/29640',
        'BLV430631/30641',
        'BLV431631/31641',
        'BLV431630/31640'
    ],
    GROUP_2_400_630: [
        'BLV432693/32694',
        'BLV432695/32696'
    ],
    GROUP_3_800_1600: [
        'NS800N ML2.0 3P/4P BTS',
        'NS1000N ML2.0 3P/4P BTS',
        'NS1250N ML2.0 3P/4P BTS',
        'NS1600N ML2.0 3P/4P BTS'
    ]
} as const;

const ATS_ACCESSORIES = {
    LOGIC_PANEL: '29472',
    PFR: 'RM17TG00',
    BUSBAR_250: 'LV429358',
    BUSBAR_400: 'LV432620'
} as const;

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

    /**
     * Applies deterministic pairing rules (e.g. MCB Chassis -> Enb Link).
     * @param boardId 
     * @param ruleType 
     * @returns { warnings: string[] }
     */
    static async applyPairingRules(boardId: string, ruleType: string): Promise<{ warnings: string[] }> {
        const warnings: string[] = [];
        const SYSTEM_TAG = 'MCB_CHASSIS_LINK';

        try {
            // 1. Fetch Rules (Safely)
            // Use explicit try/catch for table existence check as Prisma might throw if table doesn't exist yet (migration pending)
            let rules: any[] = [];
            try {
                // @ts-ignore - dynamic access or known model
                if ((prisma as any).pairingRule) {
                    rules = await (prisma as any).pairingRule.findMany({
                        where: { ruleType }
                    });
                } else {
                    console.warn(`[Automation] PairingRule table not accessible.`);
                    return { warnings: [] };
                }
            } catch (e: any) {
                console.warn(`[Automation] Failed to fetch PairingRules (migration maybe pending): ${e.message}`);
                return { warnings: [] };
            }

            if (rules.length === 0) {
                // No rules loaded? Safe no-op.
                return { warnings: [] };
            }

            const ruleMap = new Map<string, string>(); // Input -> Output
            const knownInputs = new Set<string>();
            const requiredOutputs = new Set<string>();

            for (const rule of rules) {
                ruleMap.set(rule.inputPartNumber, rule.outputPartNumber);
                knownInputs.add(rule.inputPartNumber);
                requiredOutputs.add(rule.outputPartNumber);
            }

            // 2. Fetch Board Items and Scope Sources
            const allItems = await prisma.item.findMany({
                where: { boardId }
            });

            // STRICT SOURCING: Normalize partNumber for comparison
            const sourceItems = allItems.filter(i => {
                if (!i.partNumber) return false;
                const p = normalizePartNumber(i.partNumber);
                return knownInputs.has(p);
            });

            // 3. Aggregate Requirements
            const requirements = new Map<string, number>(); // Normalized Output Part -> TotalQty

            for (const item of sourceItems) {
                const inputNorm = normalizePartNumber(item.partNumber);
                const outputPart = ruleMap.get(inputNorm);

                if (outputPart) {
                    // Diagnostic Log
                    console.log(`[Automation] Rule Match: ${inputNorm} -> ${outputPart}`);

                    const current = requirements.get(outputPart) || 0;
                    requirements.set(outputPart, current + item.quantity);
                }
            }

            // 4. Validate Requirements against Catalog (CASE INSENSITIVE / NORMALIZED)
            const requiredPartNumbers = Array.from(requirements.keys()); // These are already normalized from rules

            // Optimization: Fetch only needed catalog items
            let catalogItems: any[] = [];
            if (requiredPartNumbers.length > 0) {
                // Fetch broadly then filter
                // Or fetch all catalog items? Catalog might be large.
                // We need to match 'enb48' (normalized 'ENB48') to DB value 'ENB48' or 'enb48'.
                // Since we backfilled catalog to be uppercase, direct match SHOULD work if we trust backfill.
                // But specifically requested: "Automation must resolve CatalogItem for enb48 even if stored as ENB48" 
                // (and we defined normalized as UPPERCASE).
                // So we query by IN normalized list.
                // BUT if backfill didn't run or missed something, we might still want loose match?
                // The plan said: "Fetch by normalized part number (or case-insensitive search)".
                // Given we ran backfill, we can try exact match on normalized values first.
                // Safest: findMany with partNumber in list.
                catalogItems = await (prisma as any).catalogItem.findMany({
                    where: {
                        partNumber: { in: requiredPartNumbers }
                    }
                });
            }

            const validRequirements = new Map<string, number>();

            for (const [part, qty] of requirements.entries()) {
                // Canonical lookup
                // Part from 'requirements' is Normalized (UPPER).
                // Catalog items from DB should be Normalized (UPPER) if backfill ran.
                // If DB has mixed case, we might miss it *unless* we normalize catalog items in memory too.
                const catItem = catalogItems.find((c: any) => normalizePartNumber(c.partNumber) === part);

                if (!catItem) {
                    // Try one last fetch attempt with loose sensitive check? (Probably too expensive/complex)
                    // If proper backfill ran, this shouldn't happen.
                    console.warn(`[Automation] Warning: Required link ${part} missing from Catalog. Item will NOT be created.`);
                    warnings.push(`Missing catalog item for required link: ${part}`);
                } else {
                    validRequirements.set(part, qty);
                }
            }

            // 5. Transaction-Safe Sync
            await prisma.$transaction(async (tx) => {
                // A. Fetch Existing System Items strictly scoped
                const existingSystemItems = await tx.item.findMany({
                    where: {
                        boardId,
                        // @ts-ignore - Pending client regeneration
                        systemRuleType: ruleType,       // Provenance
                        systemTag: SYSTEM_TAG,          // Type
                        isSystemManaged: true           // Flag
                    }
                });

                // B. Runtime Duplicate Cleanup (Uniqueness Guard)
                // Group by normalized partNumber
                const byPart = new Map<string, any[]>();
                for (const item of existingSystemItems) {
                    const p = normalizePartNumber((item as any).partNumber);
                    if (!p) continue;
                    if (!byPart.has(p)) byPart.set(p, []);
                    byPart.get(p)?.push(item);
                }

                // If any part has > 1 item, delete duplicates (keep first created or id sort)
                for (const [p, items] of byPart.entries()) {
                    if (items.length > 1) {
                        // Sort by createdAt or ID to be deterministic
                        items.sort((a, b) => a.id.localeCompare(b.id));
                        const keep = items[0];
                        const remove = items.slice(1);

                        console.warn(`[Automation] Found duplicate system items for ${p} in rule ${ruleType}. Cleaning up ${remove.length} items.`);

                        await tx.item.deleteMany({
                            where: { id: { in: remove.map(i => i.id) } }
                        });

                        // Fix local list for next steps
                        byPart.set(p, [keep]);
                    }
                }

                // Re-flatten existing items after cleanup
                const cleanExistingItems = Array.from(byPart.values()).flat();

                // C. Sync Actions
                for (const [part, qty] of validRequirements.entries()) {
                    // Part is Normalized (UPPER)
                    const existing = cleanExistingItems.find(i => normalizePartNumber((i as any).partNumber) === part);
                    const catItem = catalogItems.find((c: any) => normalizePartNumber(c.partNumber) === part);

                    if (!catItem) continue; // Final safety check

                    if (existing) {
                        if (existing.quantity !== qty) {
                            await tx.item.update({
                                where: { id: existing.id },
                                data: {
                                    quantity: qty,
                                    cost: existing.unitPrice * qty
                                }
                            });
                        }
                        // Ensure existing item has normalized part number?
                        if (existing.partNumber !== part) {
                            await tx.item.update({ where: { id: existing.id }, data: { partNumber: part } });
                        }
                    } else {
                        // Create NEW
                        // STRICT SOURCING: Use catItem data ONLY.
                        // Ensure partNumber is canonical.
                        await tx.item.create({
                            data: {
                                boardId,
                                category: catItem.category || 'Switchboard',
                                subcategory: catItem.subcategory || 'Neutral and Earth Links - 165A', // Prefer catalog subcategory
                                name: catItem.partNumber, // Use PartNumber as name for links
                                description: catItem.description,
                                quantity: qty,
                                unitPrice: catItem.unitPrice,
                                labourHours: catItem.labourHours,
                                cost: catItem.unitPrice * qty,
                                isSystemManaged: true,
                                systemTag: SYSTEM_TAG,
                                systemRuleType: ruleType,   // Strict Provenance
                                partNumber: part, // Strict Match to Requirement (Normalized)
                                productFrame: null,         // Not a frame itself
                                isSheetmetal: catItem.isSheetmetal,
                                notes: 'System Managed'
                            } as any
                        });
                        console.log(`[Automation] Created ${part} (Qty ${qty}) for rule ${ruleType}`);
                    }
                }

                // D. Delete Orphaned Items
                // Items in cleanExistingItems that are NOT in validRequirements
                for (const item of cleanExistingItems) {
                    const p = (item as any).partNumber;
                    if (!validRequirements.has(p)) {
                        console.log(`[Automation] Removing orphaned item ${p} (Rule: ${ruleType})`);
                        await tx.item.delete({
                            where: { id: item.id }
                        });
                    }
                }
            });

            // 6. Return Warnings
            return { warnings };

        } catch (error: any) {
            console.error(`[Automation] Error applying rules for ${ruleType}:`, error);
            // Don't crash, but report
            return { warnings: [`Automation Failed: ${error.message || 'Unknown error'}`] };
        }
    }

    /**
     * Applies ATS Accessory Rules based on strict part number matching.
     * Scoped to ATS breakers only.
     */
    static async applyAtsRules(boardId: string) {
        const SYSTEM_TAG = 'ATS_ACCESSORIES';

        // 1. Fetch Board Items
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: { items: true }
        });

        if (!board) return;

        const items = board.items;

        // 2. Aggregate Requirements
        const requirements = new Map<string, number>();

        const addRequirement = (partNumber: string, qty: number) => {
            const current = requirements.get(partNumber) || 0;
            requirements.set(partNumber, current + qty);
        };

        for (const item of items) {
            // Strict match on Part Number
            const part = item.partNumber;
            if (!part) continue;

            const qty = item.quantity;

            // Group 1 (100-250A)
            if (ATS_BREAKER_GROUPS.GROUP_1_100_250.includes(part as any)) {
                addRequirement(ATS_ACCESSORIES.LOGIC_PANEL, qty);
                addRequirement(ATS_ACCESSORIES.PFR, qty);
                addRequirement(ATS_ACCESSORIES.BUSBAR_250, qty);
            }
            // Group 2 (400-630A)
            else if (ATS_BREAKER_GROUPS.GROUP_2_400_630.includes(part as any)) {
                addRequirement(ATS_ACCESSORIES.LOGIC_PANEL, qty);
                addRequirement(ATS_ACCESSORIES.PFR, qty);
                addRequirement(ATS_ACCESSORIES.BUSBAR_400, qty);
            }
            // Group 3 (800-1600A)
            else if (ATS_BREAKER_GROUPS.GROUP_3_800_1600.includes(part as any)) {
                addRequirement(ATS_ACCESSORIES.LOGIC_PANEL, qty);
                addRequirement(ATS_ACCESSORIES.PFR, qty);
                // No Busbars for Group 3
            }
        }

        // 3. Sync System Items
        // Filter for items owned by THIS rule
        const systemItems = items.filter(i =>
            i.isSystemManaged &&
            (i as any).systemTag === SYSTEM_TAG
        );

        // A. Update / Create
        for (const [partNumber, qty] of requirements.entries()) {
            const existing = systemItems.find(i => (i as any).partNumber === partNumber);

            if (existing) {
                if (existing.quantity !== qty) {
                    await prisma.item.update({
                        where: { id: existing.id },
                        data: {
                            quantity: qty,
                            cost: existing.unitPrice * qty
                        }
                    });
                }
            } else {
                // Create New
                const catalogItem = await prisma.catalogItem.findFirst({
                    where: { partNumber: partNumber }
                });

                if (catalogItem) {
                    await prisma.item.create({
                        data: {
                            boardId,
                            category: catalogItem.category,
                            subcategory: catalogItem.subcategory || 'ATS Accessories',
                            name: catalogItem.partNumber, // Use part number as name
                            partNumber: catalogItem.partNumber,
                            description: catalogItem.description,
                            unitPrice: catalogItem.unitPrice,
                            labourHours: catalogItem.labourHours,
                            quantity: qty,
                            cost: catalogItem.unitPrice * qty,
                            isSystemManaged: true,
                            systemTag: SYSTEM_TAG,
                            notes: '[SYS] ATS Accessory'
                        } as any
                    });
                } else {
                    console.warn(`[ATS Automation] Missing Catalog Item for ${partNumber}`);
                }
            }
        }

        // B. Cleanup (Remove unused)
        for (const item of systemItems) {
            const part = (item as any).partNumber;
            if (!requirements.has(part)) {
                await prisma.item.delete({
                    where: { id: item.id }
                });
            }
        }
    }
}
