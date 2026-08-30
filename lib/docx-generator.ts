import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";
import { generateDescriptionBullets, syncDescriptionWithDraft, BoardLike } from "./description-logic";
const DEFAULT_TEMPLATE = "/templates/Estimating Standard Tender Template (2026).docx";

// Interfaces matching the QuoteContext structure (simplified for what we need)
interface Item {
    category: string;
    subcategory: string | null;
    name: string;
    quantity: number;
    notes: string | null;
}

interface Board extends BoardLike {
    id: string;
    name: string;
    type: string; // 'Main Switchboard', 'Distribution Board', etc.
    items: Item[];
    config?: any; // For pre-selection values like IP, Form, etc.
    description?: string | null; // Optional internal notes for the board
    useCustomDescription?: boolean;
    hideAutoDescription?: boolean;
    customDescription?: string | null;
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
    creator?: {
        name: string;
        email: string;
    } | null;
}

export class DocxGenerator {
    static async generate(quote: QuoteData, settings: any, templatePath?: string) {
        const actualPath = (templatePath && templatePath.trim().length > 0) ? templatePath : DEFAULT_TEMPLATE;
        const isUsingFallback = actualPath === DEFAULT_TEMPLATE;
        
        console.log(`[DOCX] Starting generation. Template: '${actualPath}' ${isUsingFallback ? '(FALLBACK TRIGGERED)' : '(USER SPECIFIED)'}`);
        
        try {
            // 1. Load the template
            console.log(`[DOCX] Fetching template from internal API...`);
            const templateToFetch = actualPath;

            // Extract filename from path if it's a local path
            let fetchUrl = templateToFetch;
            if (templateToFetch.startsWith('/templates/')) {
                const filename = templateToFetch.split('/').pop();
                if (filename) {
                    fetchUrl = `/api/templates/download?filename=${encodeURIComponent(filename)}`;
                    console.log(`[DOCX] Resolved API URL: ${fetchUrl}`);
                }
            }

            const response = await fetch(fetchUrl);
            if (!response.ok) {
                console.error(`[DOCX] Template fetch failed. Status: ${response.status}, URL: ${fetchUrl}`);
                throw new Error(`Could not find template file at ${templateToFetch} (Status: ${response.status})`);
            }
            const arrayBuffer = await response.arrayBuffer();
            console.log(`[DOCX] Template loaded successfully. Size: ${arrayBuffer.byteLength} bytes`);

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

    private static prepareData(quote: QuoteData, settings: any) {
        const today = new Date().toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });

        console.log("=== DOCX EXPORT DEBUG ===");
        console.log("Quote has", quote.boards.length, "boards");
        console.log("quote.creator:", quote.creator);
        console.log("quote.creator?.name:", quote.creator?.name);
        console.log("quote.creator?.email:", quote.creator?.email);

        // Collect drawing references to check if we should say "as shown in descriptions"
        // (Shared logic includes drawing ref, but global drawingRef in template might still use this)
        let hasAnyDrawingRef = false;
        quote.boards.forEach((board) => {
            const tempBullets = generateDescriptionBullets(board);
            if (tempBullets.some(b => b.text.includes("Drawing Reference:"))) {
                hasAnyDrawingRef = true;
            }
        });

        const finalDrawingRef = hasAnyDrawingRef
            ? "as shown in description above"
            : "As Shown";

        // Creator placeholders fallback logic
        const rawName = quote.creator?.name || "";
        const rawEmail = quote.creator?.email || "";

        const isRoleLikeName = rawName.toLowerCase() === "admin" || rawName.toLowerCase() === "administrator";
        const hasValidName = rawName.trim() !== "" && !isRoleLikeName;

        const creatorName = hasValidName ? rawName : (rawEmail || "Unknown User");
        const creatorEmail = rawEmail || "Unknown User";
        const creatorFirstName = hasValidName ? rawName.split(' ')[0] : "Unknown User";

        return {
            clientName: quote.clientName || "",
            clientCompany: quote.clientCompany || "",
            companyName: quote.clientCompany || "Chadwick Switchboards",
            projectName: quote.projectRef || "",
            date: today,
            quoteNumber: quote.quoteNumber || "",
            projectRef: quote.projectRef || "",
            drawingRef: finalDrawingRef,
            created_by: creatorName,
            created_by_name: creatorName,
            created_by_first_name: creatorFirstName,
            created_by_email: creatorEmail,
            totalPrice: `$${quote.totals.sellPrice.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            boards: quote.boards.map((board, index) => this.generateBoardData(board, index + 1)),
            settings: settings,
        };
    }

    public static generateBoardData(board: Board, itemNo: number) {
        const boardPrice = (board as any).totalSellPrice || 0;
        const options = (board as any).descriptionOptions || {};
        const draft = options.draft as { id?: string; text: string; isManual?: boolean }[] | undefined;
        const editedIds = new Set(options.editedIds || []);

        let bullets: { text: string }[] = [];

        if (draft && draft.length > 0) {
            // SYNC LOGIC: Live-update system bullets and append new ones
            // This uses the EXACT SAME shared helper as the UI for consistency.
            const latestSystem = generateDescriptionBullets(board);
            bullets = syncDescriptionWithDraft(latestSystem, draft, editedIds as Set<string>);
        } else {
            // Fallback for older boards or boards without a draft
            bullets = generateDescriptionBullets(board).map(b => ({ text: b.text }));
        }

        const boardTitle = `${board.type} ${board.name}`;

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
}
