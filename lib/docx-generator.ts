import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

// Interfaces matching the QuoteContext structure (simplified for what we need)
interface Item {
    category: string;
    subcategory: string | null;
    name: string;
    quantity: number;
    notes: string | null;
}

interface Board {
    id: string;
    name: string;
    type: string; // 'Main Switchboard', 'Distribution Board', etc.
    items: Item[];
    config?: any; // For pre-selection values like IP, Form, etc.
    description?: string; // Optional description for the board
}

interface QuoteData {
    quoteNumber: string;
    clientName: string;
    clientCompany: string;
    projectRef: string;
    description: string;
    boards: Board[];
    totals: {
        sellPrice: number;
    };
}

export class DocxGenerator {
    static async generate(quote: QuoteData, settings: any, templatePath: string) {
        console.log("DocxGenerator.generate started with path:", templatePath);
        try {
            // 1. Load the template
            console.log("Fetching template file...");
            const response = await fetch(templatePath);
            if (!response.ok) {
                throw new Error(`Could not find template file at ${templatePath} (Status: ${response.status})`);
            }
            const arrayBuffer = await response.arrayBuffer();
            console.log("Template loaded, size:", arrayBuffer.byteLength);

            // 2. Unzip the content
            const zip = new PizZip(arrayBuffer);

            // 3. Create the doc instance
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
            });

            // 4. Prepare the data
            const data = this.prepareData(quote, settings);
            console.log("Data prepared for render:", data);

            // 5. Render the document
            doc.render(data);
            console.log("Document rendered successfully");

            // 6. Generate the output
            const blob = doc.getZip().generate({
                type: "blob",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });

            // 7. Save the file
            saveAs(blob, `Quote_${quote.quoteNumber || "Draft"}.docx`);
            console.log("File saved");
        } catch (error: any) {
            console.error("Error generating DOCX:", error);
            if (error.properties && error.properties.errors) {
                console.error("--- MultiError Details ---");
                error.properties.errors.forEach((e: any) => {
                    console.error(e);
                });
            }
            throw error;
        }
    }

    // Helper to extract drawing reference from config, handling "Yes"/"No" logic
    private static getDrawingRef(config: any): string | null {
        // 1. Check drawingRefNumber (the text input)
        if (config.drawingRefNumber &&
            typeof config.drawingRefNumber === 'string' &&
            config.drawingRefNumber.trim() !== "") {
            return config.drawingRefNumber.trim();
        }

        // 2. Fallback to drawingRef if it's a valid string and NOT "Yes"/"No"/"As Shown"
        if (config.drawingRef &&
            typeof config.drawingRef === 'string' &&
            config.drawingRef.trim() !== "" &&
            config.drawingRef !== "---") {

            const lower = config.drawingRef.toLowerCase();
            if (lower !== "yes" && lower !== "no" && lower !== "as shown") {
                return config.drawingRef.trim();
            }
        }

        return null;
    }

    private static prepareData(quote: QuoteData, settings: any) {
        const today = new Date().toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        console.log("=== DOCX EXPORT DEBUG ===");
        console.log("Quote has", quote.boards.length, "boards");

        // PATCH 1: Collect drawing references from all boards to determine global string
        let hasAnyDrawingRef = false;
        quote.boards.forEach((board) => {
            let parsedConfig = board.config;
            if (typeof board.config === 'string') {
                try {
                    parsedConfig = JSON.parse(board.config);
                } catch (e) {
                    parsedConfig = {};
                }
            }
            const ref = this.getDrawingRef(parsedConfig);
            if (ref) {
                hasAnyDrawingRef = true;
                console.log(`  ✓ Found drawing ref: ${ref}`);
            }
        });

        // If we have individual drawing refs, the global text should point to them
        const finalDrawingRef = hasAnyDrawingRef
            ? "as shown in description above"
            : "As Shown";

        console.log("\n=== DRAWING REF SUMMARY ===");
        console.log("Has individual refs:", hasAnyDrawingRef);
        console.log("Final ref for template:", finalDrawingRef);
        console.log("=========================\n");

        return {
            clientName: quote.clientName || "",
            clientCompany: quote.clientCompany || "",
            companyName: quote.clientCompany || "Chadwick Switchboards",
            projectName: quote.projectRef || "",
            date: today,
            quoteNumber: quote.quoteNumber || "",
            projectRef: quote.projectRef || "",
            drawingRef: finalDrawingRef,
            totalPrice: `$${quote.totals.sellPrice.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            boards: quote.boards.map((board, index) => this.generateBoardData(board, index + 1)),
            settings: settings, // Include effective settings for template usage
        };
    }

    private static generateBoardData(board: Board, itemNo: number) {
        const boardPrice = (board as any).totalSellPrice || 0;
        const bullets = this.generateDescriptionBullets(board);
        const boardTitle = `${board.name} (${board.type})`;

        return {
            itemNo: itemNo,
            boardTitle: boardTitle,
            name: boardTitle,
            board: boardTitle,
            qty: 1,
            quantity: 1,
            price: `$${boardPrice.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            bullets: bullets,
            description: bullets,
        };
    }

    private static generateDescriptionBullets(board: Board) {
        const bullets: { text: string }[] = [];
        const type = board.type || "";
        const typeLower = type.toLowerCase();
        const items = board.items || [];

        // Parse config if it's a JSON string
        let config = board.config || {};
        if (typeof board.config === 'string') {
            try {
                config = JSON.parse(board.config);
            } catch (e) {
                console.warn(`Failed to parse config for board "${board.name}"`);
                config = {};
            }
        }

        console.log(`\n>>> Generating bullets for: "${board.name}" (${type})`);
        console.log(`    Config:`, config);
        console.log(`    Items count:`, items.length);

        // Helper to check for item existence (case-insensitive)
        const hasItem = (namePart: string) => {
            const found = items.some(i =>
                i.name.toLowerCase().includes(namePart.toLowerCase()) ||
                i.category.toLowerCase().includes(namePart.toLowerCase())
            );
            if (found) console.log(`    ✓ Found item matching "${namePart}"`);
            return found;
        };

        const hasCategory = (cat: string) => {
            const found = items.some(i => i.category.toLowerCase() === cat.toLowerCase());
            if (found) console.log(`    ✓ Found category "${cat}"`);
            return found;
        };

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

        // PATCH 6: Helper to normalize ratings (remove duplicate A, kA, etc.)
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

        // PATCH 6: Helper to normalize fault rating (prevent "36kAkA")
        const normalizeFaultRating = (rating: any): string => {
            if (!rating) return "";
            let normalized = String(rating).trim();
            // Remove any existing kA suffix
            normalized = normalized.replace(/kA+$/i, '');
            // Remove any whitespace
            normalized = normalized.trim();
            // If it's just a number, return it (kA will be added in the template)
            return normalized;
        };

        // --- 1. MAIN SWITCHBOARD (MSB) ---
        if (typeLower.includes("main switchboard") || typeLower.includes("(msb)")) {
            console.log("    → Matched MSB logic");

            // 1. Location + IP + Form + Fault + Standard
            const ip = config.ipRating || "IP42";
            const isOutdoor = ["IP55", "IP56", "IP65", "IP66"].includes(ip);
            const location = isOutdoor ? "Outdoor" : "Indoor";
            const form = config.formRating || "Form 3b";
            const fault = normalizeFaultRating(config.faultRating || "25");
            bullets.push({ text: `${location}, ${ip}, ${form}, ${fault}kA, AS61439` });

            // 2. Enclosure Type
            const encType = config.enclosureType || "Mild Steel";
            if (encType.toLowerCase().includes("stainless")) {
                bullets.push({ text: "316 Stainless Steel Switchboard Enclosure" });
            } else {
                bullets.push({ text: "Powder Coated Mild Steel Switchboard Enclosure" });
            }

            // 3. SPD (Service Protection Device)
            if (config.spd || config.hasSPD || hasItem("Surge Diverter") || hasItem("SPD")) {
                const currentRating = config.currentRating;
                if (isValidRating(currentRating)) {
                    bullets.push({ text: `${normalizeRating(currentRating)} Service Protection Device` });
                } else {
                    bullets.push({ text: "Service Protection Device" });
                }
            }

            // 4. CT Metering
            if (hasCategory("CT Metering") || hasItem("CT")) {
                if (hasItem("Meter Panel") || hasItem("Panel")) {
                    bullets.push({ text: "Supply Authority CT Metering (Meter Panel included)" });
                } else {
                    bullets.push({ text: "Supply Authority CT Metering (Meter Panel not included)" });
                }
            }

            // PATCH 2: 5. Whole Current Metering (improved detection)
            if (hasCategory("Whole Current Metering") || hasCategory("Whole Current") || hasItem("Whole Current") || hasItem("100A") || hasItem("100 A")) {
                bullets.push({ text: "Supply Authority Whole Current Metering Positions per Single Line Diagram" });
            }

            // 6. Circuit Breakers
            if (hasCategory("Circuit Breakers") || hasItem("CB") || hasItem("MCB") || hasItem("MCCB") || hasItem("Breaker")) {
                bullets.push({ text: "Circuit Breakers per Single Line Diagram" });
            }

            // 7. Surge Diverters
            if (hasItem("Surge Diverter") || hasItem("Surge")) {
                bullets.push({ text: "Surge Diverter(s)" });
            }

            // PATCH 3: 8. Power Meters (improved detection)
            if (hasCategory("Power Meters") || hasCategory("Metering") || hasItem("Power Meter") || hasItem("kWh") || hasItem("Digital Meter")) {
                bullets.push({ text: "Power Meters" });
            }

            // PATCH 4: 9. Transfer Switch (ATS/MTS improved detection)
            if (hasItem("Automatic Transfer") || hasItem("ATS")) {
                bullets.push({ text: "Automatic Transfer Switch" });
            } else if (hasItem("Manual Transfer") || hasItem("MTS")) {
                bullets.push({ text: "Manual Transfer Switch" });
            }

            // PATCH 5: 10. Heater (improved detection)
            if (hasItem("Heater") || hasItem("Anti-condensation") || hasItem("Anti-Condensation") || hasItem("Temperature")) {
                bullets.push({ text: "Anti-condensation Heater" });
            }
        }

        // --- 2. DISTRIBUTION BOARD (MDB/DB) ---
        else if (typeLower.includes("distribution board") || typeLower.includes("(mdb)") || typeLower.includes("(db)") || typeLower === "mdb" || typeLower === "db") {
            console.log("    → Matched MDB/DB logic");

            // 1. Location + IP + Wall-Mounted + Form + Icc
            const ip = config.ipRating || "IP42";
            const isOutdoor = ["IP55", "IP56", "IP65", "IP66"].includes(ip);
            const location = isOutdoor ? "Outdoor" : "Indoor";
            const form = config.formRating || "Form 2bi";
            const fault = normalizeFaultRating(config.faultRating || "10");
            bullets.push({ text: `${location}, ${ip}, Wall-Mounted, ${form}, Icc=${fault}kA` });

            // 2. Main Switch (with normalized rating)
            const rating = config.currentRating;
            if (isValidRating(rating)) {
                bullets.push({ text: `${normalizeRating(rating)} Main Switch` });
            } else {
                bullets.push({ text: "Main Switch" });
            }

            // 3. Optional Extras (only if items exist)
            if (hasItem("Surge Diverter") || hasItem("Surge")) {
                bullets.push({ text: "Surge Diverter" });
            }
            // PATCH 3: Improved Power Meter detection
            if (hasItem("Power Meter") || hasItem("Dual Power") || hasItem("kWh") || hasCategory("Power Meters")) {
                bullets.push({ text: "Dual Power Meter" });
            }
            if (hasItem("Lighting Test") || hasItem("Emergency Lighting") || hasItem("Test Kit")) {
                bullets.push({ text: "Emergency Lighting Test Kit" });
            }
            // PATCH 5: Heater for Distribution Boards
            if (hasItem("Heater") || hasItem("Anti-condensation") || hasItem("Temperature")) {
                bullets.push({ text: "Anti-condensation Heater" });
            }

            // 4. Always include
            bullets.push({ text: "MCB Chassis per Single Line Diagram" });
            bullets.push({ text: "Circuit Breakers per Single Line Diagram" });
        }

        // --- 3. PREWIRED WHOLE CURRENT METER PANEL ---
        else if (typeLower.includes("meter panel") || typeLower.includes("prewired")) {
            console.log("    → Matched Meter Panel logic");

            // 1. Fixed line
            bullets.push({ text: "Indoor, IP2X, Wall-Mounted, Form 1, Complete with Back Plate" });

            // 2. Main Switch (with normalized rating)
            const rating = config.currentRating;
            if (isValidRating(rating)) {
                bullets.push({ text: `${normalizeRating(rating)} Main Switch` });
            } else {
                bullets.push({ text: "Main Switch" });
            }

            // 3. Count metering positions
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

            // Format with leading zeros
            if (count1ph > 0) {
                bullets.push({ text: `${String(count1ph).padStart(2, '0')} x 63A 1ph Metering Positions` });
            }
            if (count3ph > 0) {
                bullets.push({ text: `${String(count3ph).padStart(2, '0')} x 63A 3ph Metering Positions` });
            }
        }

        // --- 4. CT ENCLOSURE / CT CHAMBER ---
        else if (typeLower.includes("ct enclosure") || typeLower.includes("ct chamber")) {
            console.log("    → Matched CT Enclosure logic");

            const rating = config.currentRating;
            if (isValidRating(rating)) {
                bullets.push({ text: `Supply Authority CT Metering Enclosure ${normalizeRating(rating)}` });
            } else {
                bullets.push({ text: "Supply Authority CT Metering Enclosure" });
            }
        }

        // PATCH 7: --- FALLBACK / GENERIC (Tee-Off-Box, etc.) ---
        else {
            console.log("    → Using generic fallback");

            // Improved logic for Tee-Off-Box and other generic boards
            if (config.ipRating) {
                bullets.push({ text: `IP Rating: ${config.ipRating}` });
            }
            if (isValidRating(config.currentRating)) {
                bullets.push({ text: `${normalizeRating(config.currentRating)} Main Switch` });
            }
            bullets.push({ text: "Items per Single Line Diagram" });
        }

        // Add per-item Drawing Reference bullet
        const drawingRef = DocxGenerator.getDrawingRef(config);
        if (drawingRef) {
            bullets.push({ text: `Drawing Reference: ${drawingRef}` });
        }

        // Add board-specific notes from config with "Notes:" prefix
        if (board.description && board.description.trim() !== "") {
            bullets.push({ text: `Notes: ${board.description.trim()}` });
        }
        if (config.notes && config.notes.trim() !== "") {
            bullets.push({ text: `Notes: ${config.notes.trim()}` });
        }

        console.log(`    Generated ${bullets.length} bullets`);
        return bullets;
    }
}
