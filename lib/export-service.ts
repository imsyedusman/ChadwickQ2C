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

        const quoteData = {
            quoteNumber: quote.quoteNumber,
            clientName: quote.clientName,
            clientCompany: quote.clientCompany,
            projectRef: quote.projectRef,
            description: quote.description,
            boards: quote.boards.map((board: any) => {
                // Use pre-calculated board total if available (ensures consistency with route.ts)
                const preCalculated = totals.boardTotals?.find((t: any) => t.boardId === board.id);

                let boardTotal;
                if (preCalculated) {
                    boardTotal = preCalculated.sellPriceRounded;
                } else {
                    // Fallback to calculation
                    boardTotal = this.calculateBoardTotal(board.items, settings);
                }

                return {
                    ...board,
                    totalSellPrice: boardTotal
                };
            }),
            totals: {
                // Use sellPriceRounded (Ex GST) as requested
                sellPrice: totals.grandTotals.sellPriceRounded
            }
        };

        await DocxGenerator.generate(quoteData, settings, (quote as any).templatePath);
    }

    private static calculateBoardTotal(items: any[], settings: any): number {
        let materialCost = 0;
        let labourHours = 0;

        items.forEach(item => {
            materialCost += (item.unitPrice || 0) * (item.quantity || 0);
            labourHours += (item.labourHours || 0) * (item.quantity || 0);
        });

        // 1. Labour Cost
        const labourCost = labourHours * settings.labourRate;

        // 2. Consumables Cost (percentage of material cost)
        const consumablesCost = materialCost * settings.consumablesPct;

        // 3. Cost Base = Material + Labour + Consumables
        const costBase = materialCost + labourCost + consumablesCost;

        // 4. Overhead Cost (percentage of cost base)
        const overheadAmount = costBase * settings.overheadPct;

        // 5. Engineering Cost (percentage of cost base)
        const engineeringCost = costBase * settings.engineeringPct;

        // 6. Total Cost = Cost Base + Overhead + Engineering
        const totalCost = costBase + overheadAmount + engineeringCost;

        // 7. Sell Price = Total Cost / (1 - Target Margin)
        const marginFactor = 1 - settings.targetMarginPct;
        const sellPrice = marginFactor > 0 ? totalCost / marginFactor : totalCost;

        // 8. Rounded Sell Price
        const sellPriceRounded = Math.round(sellPrice / settings.roundingIncrement) * settings.roundingIncrement;

        return sellPriceRounded;
    }
}
