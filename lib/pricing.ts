import { Prisma } from '@prisma/client';

export interface PricingContext {
    copperPrice: number;
}

export interface BusbarCatalogItem {
    category: string | null;
    subcategory: string | null;
    partNumber: string | null;
    totalCopperWeightKgPerMeter: number | null;
    isCopperPriced: boolean;
    unitPrice: number;
}

/**
 * Calculates the unit price for a busbar item based on copper price.
 * 
 * Logic:
 * If isCopperPriced is true:
 *    Unit Price = Copper Price ($/kg) * Weight (kg/m)
 * Else:
 *    Unit Price = Catalog Static Price
 * 
 * @param item Catalog Item with weight and pricing flags
 * @param context Pricing context containing effective copper price
 * @returns { unitPrice: Decimal }
 * @throws Error if isCopperPriced is true but weight is missing
 */
export function calculateBusbarUnitPrice(
    item: BusbarCatalogItem,
    context: PricingContext
): Prisma.Decimal {
    // 1. Check if Dynamic Pricing applies
    if (item.isCopperPriced) {
        // Guard Clause: Weight MUST exist
        if (item.totalCopperWeightKgPerMeter === null || item.totalCopperWeightKgPerMeter === undefined) {
            throw new Error(`[Dynamic Pricing] Missing copper weight for ${item.partNumber} (Copper Priced Item)`);
        }

        // 2. Calculate: Price = Rate * Weight
        // We use Prisma.Decimal for precision if available, or strict number math rounded carefully?
        // Since input is number (sqlite/postgres float), we convert to Decimal for calc.
        const rate = new Prisma.Decimal(context.copperPrice);
        const weight = new Prisma.Decimal(item.totalCopperWeightKgPerMeter);

        return rate.mul(weight);
    }

    // Fallback: Static Price
    return new Prisma.Decimal(item.unitPrice);
}

export interface PricingItem {
    quantity: string | number | Prisma.Decimal;
    unitPrice: number;
    labourHours: number;
    isSheetmetal?: boolean;
    subcategory?: string | null;
    isCopperPriced?: boolean;
    totalCopperWeightKgPerMeter?: number | null;
}

export interface PricingBoard {
    id: string;
    config?: any;
    items: PricingItem[];
}

export interface PricingSettings {
    labourRate: number;
    consumablesPct: number;
    overheadPct: number;
    engineeringPct: number;
    targetMarginPct: number;
    gstPct: number;
    roundingIncrement: number;
    copperPricePerKg: number;
}

export interface PricingBoardTotals {
    materialCost: number;
    labourHours: number;
    labourCost: number;
    consumablesCost: number;
    costBase: number;
    overheadAmount: number;
    engineeringCost: number;
    totalCost: number;
    profit: number;
    sellPrice: number;
    sellPriceRounded: number;
    sheetmetalSubtotal: number;
    sheetmetalUplift: number;
    cubicSubtotal: number;
}

export interface PricingGrandTotals extends PricingBoardTotals {
    gst: number;
    finalSellPrice: number;
}

import { computeBusbarPrice } from '@/utils/pricing/copperPricing';

export function calculateBoardTotals(items: PricingItem[], settings: PricingSettings, isCustomBoard: boolean): PricingBoardTotals {
    const getQty = (i: PricingItem) => Number(i.quantity) || 0;

    const getItemTotalPrice = (item: PricingItem) => {
        const qty = getQty(item);
        if (item.isCopperPriced && item.totalCopperWeightKgPerMeter) {
            const copperResult = computeBusbarPrice({
                copperWeightKgPerMeter: item.totalCopperWeightKgPerMeter,
                isCopperPriced: true,
                length: qty,
                copperPricePerKg: settings.copperPricePerKg
            });
            return copperResult.totalPrice;
        }
        return item.unitPrice * qty;
    };

    const sheetmetalSubtotal = items.reduce((sum, item) => {
        if (item.isSheetmetal) {
            return sum + getItemTotalPrice(item);
        }
        return sum;
    }, 0);

    const CUBIC_SUBCATEGORY = 'Cubic Switchboard Enclosures (includes busbar supports)';
    const cubicSubtotal = items.reduce((sum, item) => {
        if (item.subcategory === CUBIC_SUBCATEGORY) {
            return sum + getItemTotalPrice(item);
        }
        return sum;
    }, 0);

    const applySheetmetalUplift = isCustomBoard;
    const sheetmetalUplift = (applySheetmetalUplift ? sheetmetalSubtotal * 0.04 : 0) + (cubicSubtotal * 0.04);

    // Only include non-price-adjustments in material cost
    const baseMaterialCost = items.reduce((sum, item) => {
        if (item.subcategory === 'Price Adjustment') return sum;
        return sum + getItemTotalPrice(item);
    }, 0);

    const materialCost = baseMaterialCost + sheetmetalUplift;

    // Only include non-price-adjustments in labour
    const labourHours = items.reduce((sum, item) => {
        if (item.subcategory === 'Price Adjustment') return sum;
        return sum + (item.labourHours * getQty(item));
    }, 0);

    const labourRate = settings.labourRate || 0;
    const labourCost = labourHours * labourRate;
    const consumablesCost = materialCost * settings.consumablesPct;
    const costBase = materialCost + labourCost + consumablesCost;
    const overheadAmount = costBase * settings.overheadPct;
    const engineeringCost = costBase * settings.engineeringPct;
    const totalCost = costBase + overheadAmount + engineeringCost;

    const marginFactor = 1 - settings.targetMarginPct;
    const preAdjustmentSellPrice = marginFactor > 0 ? totalCost / marginFactor : totalCost;

    // Calculate Price Adjustments Total strictly
    const priceAdjustmentsTotal = items.reduce((sum, item) => {
        if (item.subcategory === 'Price Adjustment') {
            const up = Number(item.unitPrice) || 0;
            const q = Number(item.quantity) || 0;
            return sum + (up * q);
        }
        return sum;
    }, 0);

    const sellPrice = preAdjustmentSellPrice + priceAdjustmentsTotal;
    const profit = sellPrice - totalCost;

    const rInc = settings.roundingIncrement;
    const preAdjustmentRounded = (rInc && rInc > 0) ? Math.round(preAdjustmentSellPrice / rInc) * rInc : preAdjustmentSellPrice;
    const sellPriceRounded = preAdjustmentRounded + priceAdjustmentsTotal;

    return {
        materialCost,
        labourHours,
        labourCost,
        consumablesCost,
        costBase,
        overheadAmount,
        engineeringCost,
        totalCost,
        profit,
        sellPrice,
        sellPriceRounded,
        sheetmetalSubtotal,
        sheetmetalUplift,
        cubicSubtotal
    };
}

export function calculateQuoteTotals(boards: PricingBoard[], settings: PricingSettings): { boardTotals: Record<string, PricingBoardTotals>, grandTotals: PricingGrandTotals } {
    const allBoardTotals: Record<string, PricingBoardTotals> = {};
    const boardResults = boards.map(board => {
        let config: any = {};
        if (board.config) {
            try {
                config = typeof board.config === 'string' ? JSON.parse(board.config) : board.config;
            } catch (e) { /* ignore */ }
        }
        const isBoardCustom = config?.enclosureType === 'Custom';
        const totals = calculateBoardTotals(board.items || [], settings, isBoardCustom);
        if (board.id) {
            allBoardTotals[board.id] = totals;
        }
        return totals;
    });

    const grandTotalBase = boardResults.reduce((acc, curr) => ({
        materialCost: acc.materialCost + curr.materialCost,
        labourHours: acc.labourHours + curr.labourHours,
        labourCost: acc.labourCost + curr.labourCost,
        consumablesCost: acc.consumablesCost + curr.consumablesCost,
        costBase: acc.costBase + curr.costBase,
        overheadAmount: acc.overheadAmount + curr.overheadAmount,
        engineeringCost: acc.engineeringCost + curr.engineeringCost,
        totalCost: acc.totalCost + curr.totalCost,
        profit: acc.profit + curr.profit,
        sellPrice: acc.sellPrice + curr.sellPrice,
        sellPriceRounded: acc.sellPriceRounded + curr.sellPriceRounded,
        sheetmetalSubtotal: acc.sheetmetalSubtotal + curr.sheetmetalSubtotal,
        sheetmetalUplift: acc.sheetmetalUplift + curr.sheetmetalUplift,
        cubicSubtotal: acc.cubicSubtotal + curr.cubicSubtotal
    }), {
        materialCost: 0, labourHours: 0, labourCost: 0, consumablesCost: 0,
        costBase: 0, overheadAmount: 0, engineeringCost: 0, totalCost: 0, profit: 0,
        sellPrice: 0, sellPriceRounded: 0, sheetmetalSubtotal: 0, sheetmetalUplift: 0, cubicSubtotal: 0
    });

    const gst = grandTotalBase.sellPriceRounded * settings.gstPct;
    const finalSellPrice = grandTotalBase.sellPriceRounded + gst;

    const grandTotals = {
        ...grandTotalBase,
        gst,
        finalSellPrice
    };

    return { boardTotals: allBoardTotals, grandTotals };
}
