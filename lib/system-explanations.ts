import { Item } from '@/context/QuoteContext';
import {
    ATS_BREAKER_GROUPS,
    ATS_ACCESSORIES,
    ACCESSORY_MAP,
    getAccessoryFrame,
    SYSTEM_RULES
} from './automation';

export interface SystemExplanation {
    reason: string;
    calculation: string;
    ruleName: string;
    handler?: string;
}

/**
 * Infers the reason and calculation method for a system-managed item
 * based on its tag and the current state of the board.
 * 
 * Strict "Transparency Only" - validation logic should remain in automation.ts.
 */
export function getSystemItemExplanation(item: Item, allItems: Item[]): SystemExplanation {

    // Default Fallback
    const defaultExplanation: SystemExplanation = {
        reason: "This item is automatically managed by the system.",
        calculation: "",
        ruleName: (item as any).systemTag || (item as any).systemRuleType || "SYSTEM_MANAGED_GENERIC",
        handler: "unknown"
    };

    const isDefault = (item as any).isDefault;
    if (!item.isSystemManaged && !(item as any).isFormulaPriced && !isDefault) {
        return {
            reason: "This item was manually added.",
            calculation: "Quantity is manually set.",
            ruleName: "MANUAL_ENTRY",
            handler: "user_action"
        };
    }

    // 0. BASE INCLUSIONS (Default Items)
    if (item.category === 'Busbar' && isDefault) {
        return {
            reason: "Standard busbar inclusion based on board rating.",
            calculation: "Quantity changes override the default generated quantity and will be preserved.",
            ruleName: "BUSBAR_GENERATION",
            handler: "syncBoardItems"
        };
    }

    if (isDefault && !(item as any).systemRuleType && !(item as any).systemTag) {
        return {
            reason: "Standard inclusion for this board type.",
            calculation: "Included by default based on board configuration.",
            ruleName: "STANDARD_BASE_INCLUSION",
            handler: "createQuote/Board (Template)"
        };
    }

    // 1. STRICT LOOKUP: Use Rule Metadata if available
    const ruleType = (item as any).systemRuleType;
    if (ruleType && SYSTEM_RULES[ruleType]) {
        return {
            reason: SYSTEM_RULES[ruleType].reason,
            calculation: SYSTEM_RULES[ruleType].quantityExplanation,
            ruleName: ruleType,
            handler: SYSTEM_RULES[ruleType].handler
        };
    }

    // 2. PAIRING RULES (Generic/Dynamic)
    // If we have a ruleType but it's not in the static map
    if (ruleType) {
        return {
            reason: "Automatically paired item.",
            calculation: "Quantity derived from pairing rule.",
            ruleName: ruleType,
            handler: "dynamic_rule"
        };
    }

    const tag = (item as any).systemTag;

    // --- FALLBACK LOGIC (LEGACY) ---
    // Kept only for items that haven't been re-synced yet to have systemRuleType.

    // 1. ATS ACCESSORIES
    if (tag === 'ATS_ACCESSORIES') {
        const part = item.partNumber || item.name;

        // Find the ATS Breaker that triggered this
        const atsBreakers = allItems.filter(i => {
            if (!i.partNumber) return false;
            const p = i.partNumber;
            return ATS_BREAKER_GROUPS.GROUP_1_100_250.includes(p as any) ||
                ATS_BREAKER_GROUPS.GROUP_2_400_630.includes(p as any) ||
                ATS_BREAKER_GROUPS.GROUP_3_800_1600.includes(p as any);
        });

        if (atsBreakers.length > 0) {
            const example = atsBreakers[0];
            const count = atsBreakers.reduce((sum, b) => sum + b.quantity, 0);

            return {
                reason: `Required for ATS Breaker(s) (e.g. ${example.partNumber}).`,
                calculation: `Matches the total quantity of ATS breakers (${count}).`,
                ruleName: "ATS_ACCESSORIES_LINK_RULE",
                handler: "applyAtsRules (Legacy)"
            };
        }

        return {
            reason: "Required for ATS Breaker configuration.",
            calculation: "Based on presence of ATS source-changeover breakers.",
            ruleName: "ATS_ACCESSORIES_GENERIC",
            handler: "applyAtsRules (Legacy)"
        };
    }

    // 2. MCCB ACCESSORIES (Shields / Handles)
    if (tag === 'MCCB_ACCESSORIES' || (!tag && (item.subcategory === 'MCCB Accessories'))) {
        // Try to identify frame
        const frame = item.productFrame || getAccessoryFrame(item.name);

        if (frame) {
            // Count breakers of this frame
            const breakers = allItems.filter(i =>
                !i.isSystemManaged &&
                i.productFrame === frame &&
                i.subcategory !== 'MCCB Accessories'
            );
            const count = breakers.reduce((sum, b) => sum + b.quantity, 0);

            // Is it a shield (2x) or handle (1x)?
            const isShield = Object.values(ACCESSORY_MAP).some(m => m.shield === item.name);
            const ratio = isShield ? "2 per breaker" : "1 per breaker";

            return {
                reason: `Required for ${frame} breakers.`,
                calculation: `${ratio}. Total breakers found: ${count}.`,
                ruleName: `MCCB_ACCESSORY_${frame}_${isShield ? 'SHIELD' : 'HANDLE'}`,
                handler: "syncBoardAccessories (Legacy)"
            };
        }
    }

    // 3. MCCB TRIP / BASE PAIRING
    if (tag === 'MCCB_TRIP_BASE' || item.productFrame === 'MMC_BASE') {
        return {
            reason: "Base unit required for selected MCCB Trip Unit.",
            calculation: "1 Base per Trip Unit.",
            ruleName: "MCCB_TRIP_BASE_PAIRING",
            handler: "syncMccbTripBasePairs (Legacy)"
        };
    }

    // 4. CT METERING
    if (tag === 'CT_METERING' || item.subcategory === 'CT Metering') {
        return {
            reason: "CT Metering is enabled for this board.",
            calculation: "Standard allowance for CT Chamber/Panel.",
            ruleName: "CT_METERING_PROVISION",
            handler: "syncCtMetering (Legacy)"
        };
    }

    // 4.5 DIGITAL METERING
    if (tag === 'DIGITAL_METER') {
        return {
            reason: "Digital Metering is active on this board.",
            calculation: "Derived from total number of digital meters.",
            ruleName: "DIGITAL_METER_AUTOMATION",
            handler: "syncBoardItems"
        };
    }

    // 5. COMPOSITE ITEMS
    if (tag === 'COMPOSITE' || (item as any).source === 'composite') {
        const metadata = (item as any).metadata;
        const reason = metadata?.autoReason || "Added automatically as a component.";
        return {
            reason,
            calculation: "Quantity is derived from parent item multiplier.",
            ruleName: "COMPOSITE_SYNC",
            handler: "syncBoardItems"
        };
    }

    // 6. GENERIC FALLBACK for any other system managed item
    return defaultExplanation;
}
