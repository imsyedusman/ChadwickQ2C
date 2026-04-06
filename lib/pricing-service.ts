import { enrichItems } from './enrichment';
import { calculateQuoteTotals, PricingGrandTotals, PricingBoardTotals, PricingSettings } from './pricing';
import { getEffectiveSettingsForQuote } from './settings-service';

/**
 * System-wide contract for calculated quote totals.
 * Every endpoint (GET, list, export) must return this exact structure.
 */
export interface CalculatedTotals {
    grandTotals: PricingGrandTotals;
    boardTotals: Record<string, PricingBoardTotals>;
    effectiveSettings: PricingSettings;
}

/**
 * The definitive, server-side source of truth for quote pricing.
 * Enforces:
 * 1. Correct Settings (Overrides > Snapshot > Global)
 * 2. Full Item Enrichment (Copper weights, Sheetmetal flags)
 * 3. Standardized Calculation Engine (lib/pricing.ts)
 * 
 * @param quote The quote object (must include boards and items)
 */
export async function calculateQuoteTotalsServerSide(quote: any): Promise<CalculatedTotals> {
    if (!quote) throw new Error('[Pricing Service] Cannot calculate totals for null quote');
    
    // 1. Resolve Effective Settings (Frozen if snapshot exists)
    const effectiveSettings = await getEffectiveSettingsForQuote(quote);

    // 2. Collect and Enrich all items from all boards
    const boards = quote.boards || [];
    const allItemsRaw = boards.flatMap((b: any) => b.items || []);
    
    // Deterministic Enrichment
    const enrichedItems = await enrichItems(allItemsRaw);
    
    // 3. Map enriched items back to their boards for the calculation engine
    const itemMap = new Map(enrichedItems.map((i: any) => [i.id, i]));
    const PricingBoards = boards.map((board: any) => ({
        id: board.id,
        config: board.config ? (typeof board.config === 'string' ? JSON.parse(board.config) : board.config) : {},
        items: (board.items || []).map((item: any) => itemMap.get(item.id) || item)
    }));

    // 4. Calculate Totals
    const { boardTotals, grandTotals } = calculateQuoteTotals(PricingBoards, effectiveSettings);

    return {
        grandTotals,
        boardTotals,
        effectiveSettings
    };
}
