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
                // Reverted to default delimiters {} as per user request
            });

            // 4. Prepare the data
            const data = this.prepareData(quote);
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

    private static prepareData(quote: QuoteData) {
        const today = new Date().toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        // Collect drawing references from all boards
        const drawingRefs: string[] = [];
        quote.boards.forEach(board => {
            const boardDrawingRef = board.config?.drawingRef;
            if (boardDrawingRef && boardDrawingRef.trim() !== "" && boardDrawingRef !== "---") {
                drawingRefs.push(boardDrawingRef.trim());
            }
        });

        // Remove duplicates and format
        const uniqueDrawingRefs = Array.from(new Set(drawingRefs));
        const finalDrawingRef = uniqueDrawingRefs.length > 0
            ? uniqueDrawingRefs.join(", ")
            : "As Shown";

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
        };
    }

    private static generateBoardData(board: Board, itemNo: number) {
        const boardPrice = (board as any).totalSellPrice || 0;
        const bullets = this.generateDescriptionBullets(board);
        const boardTitle = `${board.name} (${board.type})`;

        return {
            itemNo: itemNo,
            boardTitle: boardTitle,
            // Aliases for robustness
            name: boardTitle,
            board: boardTitle,

            qty: 1, // Default to 1 as per requirements
            quantity: 1, // Alias

            price: `$${boardPrice.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

            bullets: bullets,
            description: bullets, // Alias for description/bullets
        };
    }

    private static generateDescriptionBullets(board: Board) {
        const bullets: { text: string }[] = [];
        const type = board.type || "";
        const typeLower = type.toLowerCase();
        const config = board.config || {};
        const items = board.items || [];

        // Helper to check for item existence
        const hasItem = (namePart: string) => items.some(i => i.name.toLowerCase().includes(namePart.toLowerCase()) || i.category.toLowerCase().includes(namePart.toLowerCase()));
        const hasCategory = (cat: string) => items.some(i => i.category.toLowerCase() === cat.toLowerCase());

        // Helper to validate current rating (avoid showing "---")
        const isValidRating = (rating: any) => rating && rating !== "---" && rating !== "" && String(rating).trim() !== "";

        // --- 1. MAIN SWITCHBOARD ---
        // Match: "Main Switchboard", "Main Switchboard (MSB)", etc.
        if (typeLower.includes("main switchboard") || typeLower.includes("(msb)")) {
            // 1. Indoor/Outdoor
            const ip = config.ipRating || "IP42";
            const isOutdoor = ["IP55", "IP56", "IP65", "IP66"].includes(ip);
            const location = isOutdoor ? "Outdoor" : "Indoor";
            const form = config.formRating || "Form 3b";
            const fault = config.faultRating || "25";

            bullets.push({ text: `${location}, ${ip}, ${form}, ${fault}kA, AS61439` });

            // 2. Enclosure
            const encType = config.enclosureType || "Mild Steel";
            if (encType.toLowerCase().includes("stainless")) {
                bullets.push({ text: "316 Stainless Steel Switchboard Enclosure" });
            } else {
                bullets.push({ text: "Powder Coated Mild Steel Switchboard Enclosure" });
            }

            // 3. SPD
            if (config.spd || hasItem("Surge Diverter")) {
                const currentRating = config.currentRating;
                if (isValidRating(currentRating)) {
                    bullets.push({ text: `${currentRating}A Service Protection Device` });
                } else {
                    bullets.push({ text: "Service Protection Device" });
                }
            }

            // 4. CT Metering
            if (hasCategory("CT Metering") || hasItem("CT")) {
                if (hasItem("Meter Panel")) {
                    bullets.push({ text: "Supply Authority CT Metering (Meter Panel included)" });
                } else {
                    bullets.push({ text: "Supply Authority CT Metering (Meter Panel not included)" });
                }
            }

            // 5. Whole Current Metering
            if (hasCategory("Whole Current Metering") || hasItem("Whole Current") || hasItem("100A")) {
                bullets.push({ text: "Supply Authority Whole Current Metering Positions per Single Line Diagram" });
            }

            // 6. Breakers
            if (hasCategory("Circuit Breakers") || hasItem("CB") || hasItem("MCB") || hasItem("MCCB") || hasItem("Breaker")) {
                bullets.push({ text: "Circuit Breakers per Single Line Diagram" });
            }

            // 7. Surge Diverters
            if (hasItem("Surge Diverter") || hasItem("Surge")) {
                bullets.push({ text: "Surge Diverter(s)" });
            }

            // 8. Power Meters
            if (hasCategory("Power Meters") || hasItem("Power Meter") || hasItem("Meter")) {
                bullets.push({ text: "Power Meters" });
            }

            // 9. ATS / MTS
            if (hasItem("Automatic Transfer Switch") || hasItem("ATS")) {
                bullets.push({ text: "Automatic Transfer Switch" });
            } else if (hasItem("Manual Transfer Switch") || hasItem("MTS")) {
                bullets.push({ text: "Manual Transfer Switch" });
            }

            // 10. Heaters
            if (hasItem("Heater") || hasItem("Anti-condensation") || hasItem("Anti-Condensation")) {
                bullets.push({ text: "Anti-condensation Heater" });
            }
        }

        // --- 2. DISTRIBUTION BOARD ---
        // Match: "Distribution Board", "Main Distribution Board", "MDB", "DB", etc.
        else if (typeLower.includes("distribution board") || typeLower.includes("(mdb)") || typeLower.includes("(db)") || typeLower === "mdb" || typeLower === "db") {
            const ip = config.ipRating || "IP42";
            const isOutdoor = ["IP55", "IP56", "IP65", "IP66"].includes(ip);
            const location = isOutdoor ? "Outdoor" : "Indoor";
            const form = config.formRating || "Form 2bi"; // Default Form 2bi as per requirements
            const fault = config.faultRating || "10";

            bullets.push({ text: `${location}, ${ip}, Wall-Mounted, ${form}, Icc=${fault}kA` });

            // Main Switch - validate rating
            const rating = config.currentRating;
            if (isValidRating(rating)) {
                bullets.push({ text: `${rating}A Main Switch` });
            } else {
                bullets.push({ text: "Main Switch" });
            }

            // Optional Items
            if (hasItem("Surge Diverter") || hasItem("Surge")) bullets.push({ text: "Surge Diverter" });
            if (hasItem("Power Meter") || hasItem("Dual Power Meter")) bullets.push({ text: "Dual Power Meter" });
            if (hasItem("Lighting Test") || hasItem("Emergency Lighting")) bullets.push({ text: "Emergency Lighting Test Kit" });

            // Always include
            bullets.push({ text: "MCB Chassis per Single Line Diagram" });
            bullets.push({ text: "Circuit Breakers per Single Line Diagram" });
        }

        // --- 3. METER PANEL ---
        else if (typeLower.includes("meter panel") || typeLower.includes("prewired")) {
            bullets.push({ text: "Indoor, IP2X, Wall-Mounted, Form 1, Complete with Back Plate" });

            // Main Switch - validate rating
            const rating = config.currentRating;
            if (isValidRating(rating)) {
                bullets.push({ text: `${rating}A Main Switch` });
            } else {
                bullets.push({ text: "Main Switch" });
            }

            // Count positions
            let count1ph = 0;
            let count3ph = 0;
            items.forEach(i => {
                const name = i.name.toLowerCase();
                if (name.includes("1ph") || name.includes("single phase") || name.includes("1-phase")) count1ph += i.quantity;
                if (name.includes("3ph") || name.includes("three phase") || name.includes("3-phase")) count3ph += i.quantity;
            });

            // Format with leading zeros
            if (count1ph > 0) bullets.push({ text: `${String(count1ph).padStart(2, '0')} x 63A 1ph Metering Positions` });
            if (count3ph > 0) bullets.push({ text: `${String(count3ph).padStart(2, '0')} x 63A 3ph Metering Positions` });
        }

        // --- 4. CT ENCLOSURE ---
        else if (typeLower.includes("ct enclosure") || typeLower.includes("ct chamber")) {
            const rating = config.currentRating;
            if (isValidRating(rating)) {
                bullets.push({ text: `Supply Authority CT Metering Enclosure ${rating}A` });
            } else {
                bullets.push({ text: "Supply Authority CT Metering Enclosure" });
            }
        }

        // --- FALLBACK / GENERIC ---
        else {
            // Don't duplicate the type if it's already in the board title
            // Only show IP and items line
            if (config.ipRating) bullets.push({ text: `IP Rating: ${config.ipRating}` });
            if (isValidRating(config.currentRating)) {
                bullets.push({ text: `${config.currentRating}A Main Switch` });
            }
            bullets.push({ text: "Items per Single Line Diagram" });
        }

        // Add individual board notes if they exist
        // "there is also an individual notes for each switchboard that we add from the pre-selection wizard. i want those notes to show as well at the bottom of the bullet points of that specific switchboard"
        // Assuming this is stored in `config.notes` or `board.description`
        if (board.description) {
            bullets.push({ text: board.description });
        }
        if (config.notes) {
            bullets.push({ text: config.notes });
        }

        return bullets;
    }
}
