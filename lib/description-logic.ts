import { QUOTE_DESCRIPTION_MAPPINGS, MappingRule } from "./quote-mapping-config";

export interface BoardLike {
    name: string;
    type: string | null;
    config?: any;
    description?: string | null;
    items: {
        name: string;
        category: string;
        subcategory?: string | null;
        quantity: number;
    }[];
}

const RELEVANT_CATEGORIES = ['Basics', 'Switchboard', 'Busbar', 'Other'];

/**
 * SHARED SYNC HELPER
 * Reconciles the latest system-generated bullets with a stored draft.
 * Ensures new mapping-based bullets appear automatically without duplicates.
 */
export function syncDescriptionWithDraft(
    latestSystem: { id: string, text: string }[],
    currentDraft: { id?: string; text: string; isManual?: boolean }[],
    editedIds: Set<string>
): { id?: string; text: string; isManual?: boolean }[] {
    // 1. Map existing draft and sync system bullets that haven't been edited
    const updatedDraft = currentDraft.map(bullet => {
        if (bullet.id && !editedIds.has(bullet.id)) {
            const latest = latestSystem.find(b => b.id === bullet.id);
            if (latest) return { ...bullet, text: latest.text };
        }
        return bullet;
    });

    // 2. Append NEW system bullets that aren't in the draft yet
    // We deduplicate by ID first, then by normalized text to be safe
    const existingIds = new Set(updatedDraft.filter(b => b.id).map(b => b.id));
    const existingTexts = new Set(updatedDraft.map(b => b.text.trim().toLowerCase()));

    const newSystemBullets = latestSystem.filter(sys => 
        !existingIds.has(sys.id) && !existingTexts.has(sys.text.trim().toLowerCase())
    );

    return [...updatedDraft, ...newSystemBullets];
}

/**
 * Applies a set of mapping rules to board items to generate standardized bullets.
 * - Prioritizes matchers in order.
 * - Within a rule, searches for ANY item that matches (subcategory > category > name).
 * - Deduplicates: one bullet per rule.
 * - Follows the order of the rules array.
 */
function applyMappingRules(items: any[], rules: MappingRule[]): { id: string, text: string }[] {
    const results: { id: string, text: string }[] = [];
    console.log(`[Mapping] Evaluating ${rules.length} rules against ${items.length} items`);

    for (const rule of rules) {
        let matchTriggeredBy: any = null;
        
        for (const matcher of rule.matchers) {
            for (const item of items) {
                // Category Constraint (Safeguard)
                const category = item.category || '';
                const isRelevant = RELEVANT_CATEGORIES.some(rc => category.toLowerCase().includes(rc.toLowerCase()));
                if (category && !isRelevant) continue;

                const itemSubcat = (item.subcategory || '').toLowerCase();
                const itemCat = (item.category || '').toLowerCase();
                const itemName = (item.name || '').toLowerCase();

                let matchFound = false;
                if (matcher.subcategory && itemSubcat.includes(matcher.subcategory.toLowerCase())) {
                    matchFound = true;
                } else if (matcher.category && itemCat.includes(matcher.category.toLowerCase())) {
                    matchFound = true;
                } else if (matcher.name && itemName.includes(matcher.name.toLowerCase())) {
                    matchFound = true;
                }

                if (matchFound) {
                    matchTriggeredBy = item;
                    break;
                }
            }
            if (matchTriggeredBy) break;
        }

        if (matchTriggeredBy) {
            console.log(`[Mapping] MATCH: Rule '${rule.id}' triggered by item '${matchTriggeredBy.name}' (Category: ${matchTriggeredBy.category}, Sub: ${matchTriggeredBy.subcategory})`);
            results.push({ id: `auto-${rule.id}`, text: rule.displayText });
        }
    }

    return results;
}

// Helper to validate current rating (avoid showing "---", "Yes", "No")
const isValidRating = (rating: any) => {
    return rating &&
        rating !== "---" &&
        rating !== "" &&
        String(rating).trim() !== "" &&
        String(rating).toLowerCase() !== "as shown" &&
        String(rating).toLowerCase() !== "yes" &&
        String(rating).toLowerCase() !== "no";
};

// Helper to normalize ratings (remove duplicate A, kA, etc.)
const normalizeRating = (rating: any): string => {
    if (!rating) return "";
    let normalized = String(rating).trim();
    // Remove duplicate 'A' (e.g., "250AA" -> "250A")
    normalized = normalized.replace(/AA+$/i, 'A');
    // Remove duplicate 'kA' (e.g., "36kAkA" -> "36kA")
    normalized = normalized.replace(/kAkA+$/i, 'kA');
    // Remove trailing 'Aa' issue
    normalized = normalized.replace(/Aa$/i, 'A');
    // If doesn't end with A and is numeric, add A
    if (/^\d+$/.test(normalized)) {
        normalized = normalized + 'A';
    }
    return normalized;
};

/**
 * Normalizes fault rating for display.
 * If the input is just a number (e.g., "25"), it returns it (calling code adds "kA").
 * If the input contains "kA" (e.g., "36kA"), it strips it to avoid "36kAkA".
 * IMPORTANT: Respects the exact string from config (e.g., "36" stays "36").
 */
const normalizeFaultRating = (rating: any): string => {
    if (!rating) return "";
    let normalized = String(rating).trim();
    // Remove any existing kA suffix (case-insensitive) to prevent duplicates
    normalized = normalized.replace(/kA+$/i, '');
    normalized = normalized.trim();
    return normalized;
};

/**
 * Core logic for generating the automated description bullets for a board.
 * This logic is SHARED between the frontend UI preview and the backend DOCX export.
 */
export function generateDescriptionBullets(board: BoardLike): { id: string, text: string }[] {
    const bullets: { id: string, text: string }[] = [];
    const type = board.type || "";
    const typeLower = type.toLowerCase();
    const items = board.items || [];

    // Parse config if it's a JSON string
    let config = board.config || {};
    if (typeof board.config === 'string') {
        try {
            config = JSON.parse(board.config);
        } catch (e) {
            config = {};
        }
    }

    // Helper to check for item existence (case-insensitive)
    const hasItem = (namePart: string) => {
        return items.some(i =>
            i.name.toLowerCase().includes(namePart.toLowerCase()) ||
            i.category.toLowerCase().includes(namePart.toLowerCase())
        );
    };

    const hasCategory = (cat: string) => {
        return items.some(i => i.category.toLowerCase() === cat.toLowerCase());
    };

    // --- 1. MAIN SWITCHBOARD (MSB) ---
    if (typeLower.includes("main switchboard") || typeLower.includes("(msb)")) {
        // 1. Location + IP + Form + Fault + Standard
        const ip = config.ipRating || "IP42";
        const isOutdoor = ["IP55", "IP56", "IP65", "IP66"].includes(ip);
        const location = isOutdoor ? "Outdoor" : "Indoor";
        
        // Exact mapping from config.form (primary) or config.formRating (legacy)
        const formValue = config.form || config.formRating || "Form 3b";
        // Ensure "Form " prefix only if not already present
        const formStr = formValue.toLowerCase().startsWith('form') ? formValue : `Form ${formValue}`;
        
        const fault = normalizeFaultRating(config.faultRating || "25");
        bullets.push({ 
            id: "msb-specs", 
            text: `${location}, ${ip}, ${formStr}, ${fault}kA, AS61439` 
        });

        // 2. Enclosure Type
        const encType = config.material || "Mild Steel";
        if (encType.toLowerCase().includes("stainless")) {
            bullets.push({ id: "msb-material", text: "316 Stainless Steel Switchboard Enclosure" });
        } else {
            bullets.push({ id: "msb-material", text: "Powder Coated Mild Steel Switchboard Enclosure" });
        }

        // 3. SPD (Service Protection Device)
        if (config.spd || config.hasSPD || hasItem("Surge Diverter") || hasItem("SPD")) {
            const currentRating = config.currentRating;
            if (isValidRating(currentRating)) {
                bullets.push({ id: "msb-spd", text: `${normalizeRating(currentRating)} Service Protection Device` });
            } else {
                bullets.push({ id: "msb-spd", text: "Service Protection Device" });
            }
        }

        // 4. CT Metering
        const ctPref = config.ctMetering;
        let showCt = false;
        if (ctPref === 'Yes') {
            showCt = true;
        } else if (ctPref === 'No') {
            showCt = false;
        } else {
            // Fallback for older boards: pure category check only
            showCt = hasCategory("CT Metering");
        }

        if (showCt) {
            const hasPanel = config.meterPanel === 'Yes' || hasItem("Meter Panel") || hasItem("Panel");
            bullets.push({ 
                id: "msb-ct", 
                text: `Supply Authority CT Metering (Meter Panel ${hasPanel ? 'included' : 'not included'})` 
            });
        }

        // 5. Whole Current Metering
        const wcPref = config.wholeCurrentMetering;
        let showWc = false;
        if (wcPref === 'Yes') {
            showWc = true;
        } else if (wcPref === 'No') {
            showWc = false;
        } else {
            // Fallback for older boards: pure category check only
            showWc = hasCategory("Whole Current Metering") || hasCategory("Whole Current");
        }

        if (showWc) {
            bullets.push({ id: "msb-vcm", text: "Supply Authority Whole Current Metering Positions per Single Line Diagram" });
        }

        // 6. Circuit Breakers
        if (hasCategory("Circuit Breakers") || hasItem("CB") || hasItem("MCB") || hasItem("MCCB") || hasItem("Breaker")) {
            bullets.push({ id: "msb-cb", text: "Circuit Breakers per Single Line Diagram" });
        }

        // 7-10. Rule-based mappings (Surge, Meters, ATS/MTS, Heater)
        const mappedBullets = applyMappingRules(items, QUOTE_DESCRIPTION_MAPPINGS);
        bullets.push(...mappedBullets);
    }

    // --- 2. DISTRIBUTION BOARD (MDB/DB) ---
    else if (typeLower.includes("distribution board") || typeLower.includes("(mdb)") || typeLower.includes("(db)") || typeLower === "mdb" || typeLower === "db") {
        // 1. Location + IP + Wall-Mounted + Form + Icc
        const ip = config.ipRating || "IP42";
        const isOutdoor = ["IP55", "IP56", "IP65", "IP66"].includes(ip);
        const location = isOutdoor ? "Outdoor" : "Indoor";
        
        const formValue = config.form || config.formRating || "Form 2bi";
        const formStr = formValue.toLowerCase().startsWith('form') ? formValue : `Form ${formValue}`;
        
        const fault = normalizeFaultRating(config.faultRating || "10");
        bullets.push({ 
            id: "db-specs", 
            text: `${location}, ${ip}, Wall-Mounted, ${formStr}, Icc=${fault}kA` 
        });

        // 2. Main Switch (with normalized rating)
        const rating = config.currentRating;
        if (isValidRating(rating)) {
            bullets.push({ id: "db-mainswitch", text: `${normalizeRating(rating)} Main Switch` });
        } else {
            bullets.push({ id: "db-mainswitch", text: "Main Switch" });
        }

        // 3. Rule-based mappings (Surge, Meters, ATS/MTS, Heater)
        const mappedBullets = applyMappingRules(items, QUOTE_DESCRIPTION_MAPPINGS);
        bullets.push(...mappedBullets);

        // 3a. Emergency Lighting (Keep separate as it's DB specific and not in core mapping yet)
        if (hasItem("Lighting Test") || hasItem("Emergency Lighting") || hasItem("Test Kit")) {
            bullets.push({ id: "db-light-test", text: "Emergency Lighting Test Kit" });
        }

        // 4. Always include
        bullets.push({ id: "db-chassis", text: "MCB Chassis per Single Line Diagram" });
        bullets.push({ id: "db-cb", text: "Circuit Breakers per Single Line Diagram" });
    }

    // --- 3. PREWIRED WHOLE CURRENT METER PANEL ---
    else if (typeLower.includes("meter panel") || typeLower.includes("prewired")) {
        bullets.push({ id: "mp-specs", text: "Indoor, IP2X, Wall-Mounted, Form 1, Complete with Back Plate" });
 
        const rating = config.currentRating;
        if (isValidRating(rating)) {
            bullets.push({ id: "mp-mainswitch", text: `${normalizeRating(rating)} Main Switch` });
        } else {
            bullets.push({ id: "mp-mainswitch", text: "Main Switch" });
        }

        let count1ph = 0;
        let count3ph = 0;
        items.forEach(i => {
            const name = i.name.toLowerCase();
            if (name.includes("1ph") || name.includes("single phase") || name.includes("1-phase")) {
                count1ph += i.quantity;
            }
            if (name.includes("3ph") || name.includes("three phase") || name.includes("3-phase")) {
                count3ph += i.quantity;
            }
        });

        if (count1ph > 0) {
            bullets.push({ id: "mp-1ph", text: `${String(count1ph).padStart(2, '0')} x 63A 1ph Metering Positions` });
        }
        if (count3ph > 0) {
            bullets.push({ id: "mp-3ph", text: `${String(count3ph).padStart(2, '0')} x 63A 3ph Metering Positions` });
        }
    }

    // --- 4. CT ENCLOSURE / CT CHAMBER ---
    else if (typeLower.includes("ct enclosure") || typeLower.includes("ct chamber")) {
        const rating = config.currentRating;
        if (isValidRating(rating)) {
            bullets.push({ id: "ct-specs", text: `Supply Authority CT Metering Enclosure ${normalizeRating(rating)}` });
        } else {
            bullets.push({ id: "ct-specs", text: "Supply Authority CT Metering Enclosure" });
        }
    }

    // --- FALLBACK / GENERIC ---
    else {
        if (config.ipRating) {
            bullets.push({ id: "generic-ip", text: `IP Rating: ${config.ipRating}` });
        }
        if (isValidRating(config.currentRating)) {
            bullets.push({ id: "generic-mainswitch", text: `${normalizeRating(config.currentRating)} Main Switch` });
        }
        bullets.push({ id: "generic-sld", text: "Items per Single Line Diagram" });
    }

    // Add per-item Drawing Reference bullet
    // Note: getDrawingRef logic is moved here or called from here
    const getDrawingRef = (conf: any): string | null => {
        if (conf.drawingRefNumber && typeof conf.drawingRefNumber === 'string' && conf.drawingRefNumber.trim() !== "") {
            return conf.drawingRefNumber.trim();
        }
        if (conf.drawingRef && typeof conf.drawingRef === 'string' && conf.drawingRef.trim() !== "" && conf.drawingRef !== "---") {
            const lower = conf.drawingRef.toLowerCase();
            if (lower !== "yes" && lower !== "no" && lower !== "as shown") {
                return conf.drawingRef.trim();
            }
        }
        return null;
    };

    const drawingRef = getDrawingRef(config);
    if (drawingRef) {
        bullets.push({ id: "generic-drawing", text: `Drawing Reference: ${drawingRef}` });
    }

    // Add board-specific notes
    if (board.description && board.description.trim() !== "") {
        bullets.push({ id: "board-notes", text: `Notes: ${board.description.trim()}` });
    }
    if (config.notes && config.notes.trim() !== "") {
        bullets.push({ id: "config-notes", text: `Notes: ${config.notes.trim()}` });
    }

    return bullets;
}
