
export interface BoardLike {
    name: string;
    type: string | null;
    config?: any;
    description?: string | null;
    items: {
        name: string;
        category: string;
        quantity: number;
    }[];
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
        if (hasCategory("CT Metering") || hasItem("CT")) {
            if (hasItem("Meter Panel") || hasItem("Panel")) {
                bullets.push({ id: "msb-ct", text: "Supply Authority CT Metering (Meter Panel included)" });
            } else {
                bullets.push({ id: "msb-ct", text: "Supply Authority CT Metering (Meter Panel not included)" });
            }
        }

        // 5. Whole Current Metering
        if (hasCategory("Whole Current Metering") || hasCategory("Whole Current") || hasItem("Whole Current") || hasItem("100A") || hasItem("100 A")) {
            bullets.push({ id: "msb-vcm", text: "Supply Authority Whole Current Metering Positions per Single Line Diagram" });
        }

        // 6. Circuit Breakers
        if (hasCategory("Circuit Breakers") || hasItem("CB") || hasItem("MCB") || hasItem("MCCB") || hasItem("Breaker")) {
            bullets.push({ id: "msb-cb", text: "Circuit Breakers per Single Line Diagram" });
        }

        // 7. Surge Diverters
        if (hasItem("Surge Diverter") || hasItem("Surge")) {
            bullets.push({ id: "msb-surge", text: "Surge Diverter(s)" });
        }

        // 8. Power Meters
        if (hasCategory("Power Meters") || hasCategory("Metering") || hasItem("Power Meter") || hasItem("kWh") || hasItem("Digital Meter")) {
            bullets.push({ id: "msb-meters", text: "Power Meters" });
        }

        // 9. Transfer Switch
        if (hasItem("Automatic Transfer") || hasItem("ATS")) {
            bullets.push({ id: "msb-transfer", text: "Automatic Transfer Switch" });
        } else if (hasItem("Manual Transfer") || hasItem("MTS")) {
            bullets.push({ id: "msb-transfer", text: "Manual Transfer Switch" });
        }

        // 10. Heater
        if (hasItem("Heater") || hasItem("Anti-condensation") || hasItem("Anti-Condensation") || hasItem("Temperature")) {
            bullets.push({ id: "msb-heater", text: "Anti-condensation Heater" });
        }
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

        // 3. Optional Extras
        if (hasItem("Surge Diverter") || hasItem("Surge")) {
            bullets.push({ id: "db-surge", text: "Surge Diverter" });
        }
        if (hasItem("Power Meter") || hasItem("Dual Power") || hasItem("kWh") || hasCategory("Power Meters")) {
            bullets.push({ id: "db-meters", text: "Dual Power Meter" });
        }
        if (hasItem("Lighting Test") || hasItem("Emergency Lighting") || hasItem("Test Kit")) {
            bullets.push({ id: "db-light-test", text: "Emergency Lighting Test Kit" });
        }
        if (hasItem("Heater") || hasItem("Anti-condensation") || hasItem("Temperature")) {
            bullets.push({ id: "db-heater", text: "Anti-condensation Heater" });
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
