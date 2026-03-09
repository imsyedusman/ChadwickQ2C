/**
 * Centralized Logic for System-Managed Items
 * 
 * Auto-Managed: Items that the system automatically adds/removes based on configuration.
 * - Cannot be manually added (hidden from selection).
 * - Cannot be manually deleted.
 * - Quantity is system-controlled (locked).
 * 
 * Formula-Priced: Items where price/labour is calculated by a formula.
 * - Price/Labour is locked.
 * - Catalog refresh should SKIP these items to avoid overwriting calculated values.
 */

// List of Auto-Managed Item Prefixes or Full Part Numbers
const AUTO_MANAGED_ITEMS = [
    '1A-TIERS',
    '1B-TIERS-400',
    '1B-BASE',
    '1B-SS-2B',
    '1B-SS-NO4',
    'MISC-LABELS',
    'MISC-HARDWARE',
    'MISC-TEST-TIERS',
    '1A-COMPARTMENTS',
    '1A-50KA',
    '1A-COLOUR',
    'CT-COMPARTMENTS',
    'CT-PANEL',
    'CT-TEST-BLOCK',
    'CT-WIRING',
    '100A-PANEL',
    '100A-FUSE',
    '100A-NEUTRAL-LINK',
    '100A-MCB-1PH',
    '100A-MCB-3PH',
    'MISC-DELIVERY-UTE',
    'MISC-DELIVERY-HIAB',
    'MISC-SITE-RECONNECTION',
    'Busbar Insulation',
    '1B-DOORS',
    '1B-600MM',
    '1B-800MM'
];

// List of Formula-Priced Items
// Often overlaps with Auto-Managed, but not always. 
const FORMULA_PRICED_ITEMS = [
    '1B-BASE',
    '1B-SS-2B', '1B-SS-NO4',
    '1B-600MM', '1B-800MM',
    '1A-50KA', '1A-COLOUR',
    'Busbar Insulation',
    'MISC-SITE-RECONNECTION'
];

export function isAutoManaged(partNumber: string): boolean {
    if (!partNumber) return false;
    return AUTO_MANAGED_ITEMS.some(p => partNumber === p || partNumber.startsWith(p));
}

export function isFormulaPriced(partNumber: string): boolean {
    if (!partNumber) return false;
    return FORMULA_PRICED_ITEMS.includes(partNumber);
}
