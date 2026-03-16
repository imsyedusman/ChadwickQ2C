import { PrismaClient } from '@prisma/client';
import { normalizePartNumber } from './normalization';

const prisma = new PrismaClient();

// Accessory SKUs Configuration
// Accessory SKUs Configuration
export const ACCESSORY_MAP = {
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
// ATS Breaker Groups (Strict Match)
export const ATS_BREAKER_GROUPS = {
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

export const ATS_ACCESSORIES = {
    LOGIC_PANEL: '29472',
    PFR: 'RM17TG00',
    BUSBAR_250: 'LV429358',
    BUSBAR_400: 'LV432620'
} as const;

export const GENERAL_CONTROL_SKUS = {
    FUSE: 'CHD-FUSE-20A-DIN',
    WIRING: 'CHD-WIRING-CONTROL'
} as const;

export const GENERAL_CONTROL_WIRING_MAP: Record<string, number> = {
    'PBELKIT4': 0,
    'CHD-GC-EM-LIGHT-KIT': 0,
    'A9C20134': 10,
    'CHD-GC-4NC-CONTACTOR': 10,
    'CHD-GC-LIGHT-CONTACTOR-23A': 10,
    'CCT15854': 4,
    'CHD-GC-TIME-1CH': 4,
    'CCT15443': 6,
    'CHD-GC-TIME-2CH': 6,
    'CCT15940': 10,
    'CHD-GC-TIME-4CH': 10,
    'CCT15369': 6,
    'CHD-GC-PE-PROVISION': 6,
    'XB4BD33': 6,
    'CHD-GC-BYPASS': 6,
    'CHD-GC-RELAY-4P': 10,
    'RM17TG00': 6,
    'CHD-GC-PFR': 6,
    'XB5AVM4': 2,
    'CHD-GC-LED-IND': 2
};

export interface SystemRuleMetadata {
    id: string;
    handler: string;
    reason: string;
    quantityExplanation: string;
}

export const SYSTEM_RULES: Record<string, SystemRuleMetadata> = {
    // MCCB Accessories
    'MCCB_ACCESSORY_SHIELD': {
        id: 'MCCB_ACCESSORY_SHIELD',
        handler: 'syncBoardAccessories',
        reason: 'Required for MCCB (Terminal Shield).',
        quantityExplanation: '2 Shields per Breaker (Line & Load).'
    },
    'MCCB_ACCESSORY_HANDLE': {
        id: 'MCCB_ACCESSORY_HANDLE',
        handler: 'syncBoardAccessories',
        reason: 'Required for MCCB (Rotary Handle).',
        quantityExplanation: '1 Handle per Breaker.'
    },

    // MCCB Trip/Base
    'MCCB_TRIP_BASE': {
        id: 'MCCB_TRIP_BASE',
        handler: 'syncMccbTripBasePairs',
        reason: 'Base unit required for the selected Trip Unit (MCCB).',
        quantityExplanation: '1 Base per Trip Unit.'
    },

    // ATS
    'ATS_LOGIC_PANEL': {
        id: 'ATS_LOGIC_PANEL',
        handler: 'applyAtsRules',
        reason: 'Required for ATS Breaker configuration.',
        quantityExplanation: '1 Logic Panel per ATS Breaker.'
    },
    'ATS_PFR': {
        id: 'ATS_PFR',
        handler: 'applyAtsRules',
        reason: 'Phase Failure Relay required for ATS.',
        quantityExplanation: '1 PFR per ATS Breaker.'
    },
    'ATS_BUSBAR': {
        id: 'ATS_BUSBAR',
        handler: 'applyAtsRules',
        reason: 'Bridging Bars required for ATS.',
        quantityExplanation: '1 Set of Bars per ATS Breaker.'
    },

    // Generic Fallback/Dynamic
    'MCB_CHASSIS_LINK': {
        id: 'MCB_CHASSIS_LINK',
        handler: 'applyPairingRules',
        reason: 'Neutral/Earth Link required for MCB Chassis.',
        quantityExplanation: 'Links provisioned based on Chassis pole capacity.'
    },

    // Digital Meter Automation
    'DIGITAL_METER_AUTOMATION': {
        id: 'DIGITAL_METER_AUTOMATION',
        handler: 'syncBoardItems',
        reason: 'Required for Digital Metering.',
        quantityExplanation: 'Scaled strictly based on the number of Digital Meters on the board.'
    },
    'GENERAL_CONTROL_AUTOMATION': {
        id: 'GENERAL_CONTROL_AUTOMATION',
        handler: 'applyGeneralControlRules',
        reason: 'Adds control circuits (fuse + wiring) for identified General Control items.',
        quantityExplanation: 'Fuse qty = Total items. Wiring qty = Sum(qty * wires-per-unit).'
    }
};

export class AutomationService {

    /**
     * Centralized Automation Reconciliation Pipeline
     * Orchestrates all board-level automation rules.
     * Idempotent and safe for post-duplication scenarios.
     */
    static async runBoardAutomationReconciliation(boardId: string) {
        console.log(`[Automation Pipeline] Starting reconciliation for board ${boardId}`);

        try {
            // 1. MCCB Trip/Base Pairing
            console.log(`[Automation Pipeline] 1. Syncing MCCB Trip/Base Pairs`);
            await this.syncMccbTripBasePairs(boardId);

            // 2. Pairings (e.g. MCB Chassis -> Links)
            console.log(`[Automation Pipeline] 2. Applying Generic Pairing Rules`);
            // Add other pairing rules here as they are defined
            const pairingResults = await this.applyPairingRules(boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');
            if (pairingResults.warnings.length) {
                console.warn(`[Automation Pipeline] Pairing Warnings:`, pairingResults.warnings);
            }

            // 3. ATS Accessories
            console.log(`[Automation Pipeline] 3. Applying ATS Rules`);
            await this.applyAtsRules(boardId);

            // 4. MCCB Accessories (Handles/Shields)
            console.log(`[Automation Pipeline] 4. Syncing MCCB Accessories`);
            await this.syncBoardAccessories(boardId);

            // 5. General Control Automation
            console.log(`[Automation Pipeline] 5. Applying General Control Rules`);
            await this.applyGeneralControlRules(boardId);

            console.log(`[Automation Pipeline] Reconciliation Complete for board ${boardId}`);
        } catch (error) {
            console.error(`[Automation Pipeline] FAILED for board ${boardId}:`, error);
            // We log but do not throw to avoid crashing the request if part of a larger flow?
            // Actually, for duplication, we probably want to know.
            throw error;
        }
    }


    /**
     * Syncs MCCB accessories for a given board based on selected breakers.
     * Call this whenever an ITEM is added/updated/deleted on a board.
     * Refactored to 1:1 Dependency Model (2026-03-17)
     */
    static async syncBoardAccessories(boardId: string) {
        const SYSTEM_TAG = 'MCCB_ACCESSORIES';

        // 1. Fetch Board and Items
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: { quote: true, items: true }
        });

        if (!board) return;

        const allItems = board.items;

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
        const disabledHandleFrames: string[] = overrides.disableRotaryHandleFrames || [];

        // 2. Identify Breakers (Parent Items)
        const ACCESSORY_SKUS = new Set<string>(
            Object.values(ACCESSORY_MAP).flatMap(g => [g.shield, g.handle])
        );

        const breakers = allItems.filter(item => 
            !item.isSystemManaged && 
            item.productFrame && 
            item.productFrame in ACCESSORY_MAP &&
            !ACCESSORY_SKUS.has(item.name) &&
            item.subcategory !== 'MCCB Accessories'
        );

        const processedAccessoryIds = new Set<string>();

        // 3. Process each breaker
        for (const breaker of breakers) {
            const frame = breaker.productFrame as FrameType;
            const map = ACCESSORY_MAP[frame];
            const breakerQty = Number(breaker.quantity);

            const requiredAccessories = [
                { sku: map.shield, qty: breakerQty * 2, type: 'MCCB_ACCESSORY_SHIELD' as const, sub: 'MCCB Accessories' },
                { sku: map.handle, qty: breakerQty, type: 'MCCB_ACCESSORY_HANDLE' as const, sub: 'MCCB Accessories', disabled: disabledHandleFrames.includes(frame) }
            ];

            for (const req of requiredAccessories) {
                if (req.disabled) continue;

                // Find existing accessory for THIS breaker
                const existing = allItems.find(i => 
                    (i as any).parentItemId === breaker.id && 
                    i.name === req.sku &&
                    (i as any).systemTag === SYSTEM_TAG
                );

                if (existing) {
                    processedAccessoryIds.add(existing.id);
                    
                    // Update ONLY if parent quantity changed OR it's still system managed
                    // Update ONLY if it's still system managed
                    if (existing.isSystemManaged) {
                        const targetQty = req.qty;
                        const hasQtyChanged = Number(existing.quantity) !== targetQty;

                        if (hasQtyChanged) {
                            await prisma.item.update({
                                where: { id: existing.id },
                                data: {
                                    quantity: targetQty,
                                    cost: existing.unitPrice * targetQty
                                }
                            });
                        }
                    }
                } else {
                    // Create new linked accessory
                    const catalogItem = await prisma.catalogItem.findFirst({
                        where: { partNumber: req.sku }
                    });

                    if (catalogItem) {
                        const newItem = await prisma.item.create({
                            data: {
                                boardId,
                                category: 'Switchboard',
                                subcategory: req.sub,
                                name: req.sku,
                                partNumber: req.sku,
                                description: catalogItem.description,
                                unitPrice: catalogItem.unitPrice,
                                labourHours: catalogItem.labourHours,
                                quantity: req.qty,
                                cost: catalogItem.unitPrice * req.qty,
                                isSystemManaged: true,
                                autoAdded: true,
                                isDefault: true,
                                productFrame: frame,
                                notes: 'System Managed',
                                systemTag: SYSTEM_TAG,
                                systemRuleType: req.type,
                                parentItemId: breaker.id // LINK TO PARENT
                            } as any
                        });
                        processedAccessoryIds.add(newItem.id);
                    }
                }
            }
        }

        // 4. Cleanup Orphans
        // Delete items with SYSTEM_TAG that are NOT in processedAccessoryIds 
        // AND have a parent (or should have one).
        const systemAccessories = allItems.filter(i => 
            (i as any).systemTag === SYSTEM_TAG && 
            ((i as any).isSystemManaged || (i as any).autoAdded) 
        );

        for (const item of systemAccessories) {
            if (!processedAccessoryIds.has(item.id)) {
                await prisma.item.delete({ where: { id: item.id } });
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
                    requiredBases.set(basePart, current + item.quantity.toNumber());
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
                if (existing.quantity.toNumber() !== qty) {
                    await prisma.item.update({
                        where: { id: existing.id },
                        data: {
                            quantity: qty,
                            cost: existing.unitPrice * qty,
                            systemTag: SYSTEM_TAG, // Backfill tag if missing
                            systemRuleType: 'MCCB_TRIP_BASE'
                        } as any
                    });
                } else if (!(existing as any).systemTag) {
                    // Just backfill tag if quantity match
                    await prisma.item.update({
                        where: { id: existing.id },
                        data: { systemTag: SYSTEM_TAG, systemRuleType: 'MCCB_TRIP_BASE' } as any
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
                            systemTag: SYSTEM_TAG,
                            systemRuleType: 'MCCB_TRIP_BASE'
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
                    requirements.set(outputPart, current + item.quantity.toNumber());
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

            const qty = item.quantity.toNumber();

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
                if (existing.quantity.toNumber() !== qty) {
                    await prisma.item.update({
                        where: { id: existing.id },
                        data: {
                            quantity: qty,
                            cost: existing.unitPrice * qty,
                            systemRuleType: partNumber === ATS_ACCESSORIES.LOGIC_PANEL ? 'ATS_LOGIC_PANEL' :
                                partNumber === ATS_ACCESSORIES.PFR ? 'ATS_PFR' :
                                    'ATS_BUSBAR'
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
                            systemRuleType: partNumber === ATS_ACCESSORIES.LOGIC_PANEL ? 'ATS_LOGIC_PANEL' :
                                partNumber === ATS_ACCESSORIES.PFR ? 'ATS_PFR' :
                                    'ATS_BUSBAR',
                            notes: '[SYS] ATS Accessory'
                        } as any
                    });
                } else {
                    console.warn(`[ATS Automation] Missing Catalog Item for ${partNumber}`);
                }
            }
        }
    }

    /**
     * Applies General Control Automation Rules.
     * Calculates required Fuse and Wiring quantities based on selectable GC items.
     * Idempotent and transaction-safe.
     */
    static async applyGeneralControlRules(boardId: string) {
        const SYSTEM_TAG = 'GENERAL_CONTROL';

        // 1. Fetch Board Items
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            include: { items: true }
        });

        if (!board) return;

        const items = board.items;

        // 2. Identify Selectable General Control Items
        // Source Group: category="Switchboard", subcategory contains "General Control"
        // EXCLUDE: Auto-added fuse/wiring items (by SKU)
        const selectableItems = items.filter(i => 
            i.category === 'Switchboard' && 
            (i.subcategory || '').includes('General Control') &&
            i.partNumber !== GENERAL_CONTROL_SKUS.FUSE &&
            i.partNumber !== GENERAL_CONTROL_SKUS.WIRING
        );

        console.log(`[GC Automation] Board ${boardId} — Found ${selectableItems.length} selectable GC items:`,
            selectableItems.map(i => `${i.partNumber}(qty=${i.quantity})`));

        // 3. Calculate Requirements
        let totalQty = 0;
        let totalWires = 0;

        for (const item of selectableItems) {
            const qty = Number(item.quantity) || 0;
            totalQty += qty;

            const wiresPerUnit = GENERAL_CONTROL_WIRING_MAP[item.partNumber || ''] ?? 0;
            totalWires += (qty * wiresPerUnit);
        }

        console.log(`[GC Automation] FuseQty=${totalQty}, WireQty=${totalWires}`);

        const requirements = new Map<string, number>();
        if (totalQty > 0) requirements.set(GENERAL_CONTROL_SKUS.FUSE, totalQty);
        if (totalWires > 0) requirements.set(GENERAL_CONTROL_SKUS.WIRING, totalWires);

        // 4. Sync System Items
        // Detect managed items by: systemTag match OR known GC output SKU
        // (catches items created before the systemTag was in place)
        const GC_OUTPUT_SKUS = new Set<string>([GENERAL_CONTROL_SKUS.FUSE, GENERAL_CONTROL_SKUS.WIRING]);
        const systemItems = items.filter(i =>
            i.isSystemManaged &&
            ((i as any).systemTag === SYSTEM_TAG || GC_OUTPUT_SKUS.has(i.partNumber || ''))
        );

        await prisma.$transaction(async (tx) => {
            // A. Update or Create
            for (const [partNumber, qty] of requirements.entries()) {
                const existing = systemItems.find(i => i.partNumber === partNumber);

                if (existing) {
                    // Update only if quantity changed (Idempotency)
                    if (Number(existing.quantity) !== qty) {
                        await tx.item.update({
                            where: { id: existing.id },
                            data: {
                                quantity: qty,
                                cost: Number(existing.unitPrice) * qty
                            }
                        });
                        console.log(`[GC Automation] Updated ${partNumber} to Qty ${qty}`);
                    }
                } else {
                    // Create New from Catalog
                    const catalogItem = await tx.catalogItem.findFirst({
                        where: { partNumber: partNumber }
                    });

                    if (catalogItem) {
                        await tx.item.create({
                            data: {
                                boardId,
                                category: catalogItem.category || 'Switchboard',
                                subcategory: catalogItem.subcategory || 'Miscellaneous',
                                name: catalogItem.partNumber || partNumber,
                                partNumber,
                                description: catalogItem.description,
                                unitPrice: catalogItem.unitPrice,
                                labourHours: catalogItem.labourHours,
                                quantity: qty,
                                cost: Number(catalogItem.unitPrice) * qty,
                                isSystemManaged: true,
                                autoAdded: true,
                                systemTag: SYSTEM_TAG,
                                systemRuleType: 'GENERAL_CONTROL_AUTOMATION',
                                notes: 'System Managed'
                            } as any
                        });
                        console.log(`[GC Automation] Created ${partNumber} (Qty ${qty})`);
                    } else {
                        console.error(`[GC Automation] Missing Catalog Item for auto-required: ${partNumber}`);
                    }
                }
            }

            // B. Cleanup (Remove if no longer required)
            for (const item of systemItems) {
                if (!requirements.has(item.partNumber || '')) {
                    await tx.item.delete({ where: { id: item.id } });
                    console.log(`[GC Automation] Removed orphaned item ${item.partNumber}`);
                }
            }
        });
    }
}
