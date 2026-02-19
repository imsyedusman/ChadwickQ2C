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
