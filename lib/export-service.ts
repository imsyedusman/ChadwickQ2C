import { DocxGenerator } from "./docx-generator";

interface ExportData {
    quote: any;
    settings: any;
    totals: any;
}

export class ExportService {
    static async generateQuoteDocument({ quote, settings, totals }: ExportData) {
        // We need to merge the totals into the quote object or pass them effectively
        // The DocxGenerator expects a structure where it can find the totals.
        // We'll construct the full object here.

        // Enrich boards with their specific totals if available in the 'totals' object
        // The 'totals' passed here is usually the grand total. 
        // We might need to calculate per-board totals if they aren't on the board objects.
        // However, looking at QuoteContext, 'boardTotals' is a separate object for the *selected* board.
        // We need totals for ALL boards.

        // Let's calculate per-board totals here to be safe, or assume they are on the board items.
        // A simple summation of item prices for the export is safer.

        const quoteData = {
            quoteNumber: quote.quoteNumber,
            clientName: quote.clientName,
            clientCompany: quote.clientCompany,
            projectRef: quote.projectRef,
            description: quote.description,
            boards: quote.boards.map((board: any) => {
                // Calculate board total
                const boardTotal = totals.boardTotals.find((bt: any) => bt.boardId === board.id);
                return {
                    ...board,
                    totalSellPrice: boardTotal ? boardTotal.sellPriceRounded : 0
                };
            }),
            totals: {
                sellPrice: totals.grandTotals.finalSellPrice
            }
        };

        await DocxGenerator.generate(quoteData, settings, (quote as any).templatePath);
    }
}
