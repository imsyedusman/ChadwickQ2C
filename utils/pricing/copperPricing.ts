export interface CopperPricingParams {
    copperWeightKgPerMeter: number | null | undefined;
    isCopperPriced: boolean | null | undefined;
    length: number; // Item quantity (meters)
    copperPricePerKg: number;
}

/**
 * Computes the unit price (which is actually the total price for the item line if quantity is length)
 * But wait, typically unitPrice is per 1 unit.
 * For busbars, the stored "unitPrice" was historically calc'd at creation.
 * Now we want dynamic.
 * 
 * If the item is copper priced:
 * Price = Length (qty) * Weight/m * $/kg
 * 
 * BUT: The frontend renders "Unit Price" and "Total Price".
 * For a busbar, "Unit" is 1 meter? Or is the Item itself the unit?
 * The `quantity` field in Item is the length in meters for busbar items.
 * 
 * So:
 * Total Price = quantity * (weight/m * copperPrice/kg)
 * 
 * The effective "Unit Price" (per meter) = weight/m * copperPrice/kg
 */
export function computeBusbarPrice(params: CopperPricingParams): { unitPrice: number; totalPrice: number } {
    const { copperWeightKgPerMeter, isCopperPriced, length, copperPricePerKg } = params;

    // Default fallbacks to 0 to be safe
    const weight = copperWeightKgPerMeter || 0;
    const pricePerKg = copperPricePerKg || 0;
    const qty = length || 0;

    if (isCopperPriced && weight > 0) {
        const unitPrice = weight * pricePerKg;
        const totalPrice = unitPrice * qty;
        return { unitPrice, totalPrice };
    }

    // Should not happen if called correctly for busbars, but return 0s if data missing
    return { unitPrice: 0, totalPrice: 0 };
}
