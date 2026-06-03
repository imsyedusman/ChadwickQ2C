/**
 * Utility functions for displaying mapped data to the user without altering internal records.
 */

/**
 * Maps internal enclosure part numbers to their display formats.
 * 1A -> IFM
 * 1B -> IFC
 * Examples: 1A-TIERS -> IFM-TIERS, 1B-COMPARTMENTS -> IFC-COMPARTMENTS
 * 
 * @param partNumber The internal part number (e.g., from CatalogItem)
 * @returns The display-friendly mapped part number
 */
export function getDisplayPartNumber(partNumber: string | null | undefined): string {
    if (!partNumber) return '';
    
    if (partNumber.startsWith('1A-') || partNumber === '1A') {
        return partNumber.replace(/^1A/, 'IFM');
    }
    
    if (partNumber.startsWith('1B-') || partNumber === '1B') {
        return partNumber.replace(/^1B/, 'IFC');
    }
    
    if (partNumber.startsWith('1B1-') || partNumber === '1B1') {
        return partNumber.replace(/^1B1/, 'IFC1');
    }
    
    return partNumber;
}
