
/**
 * Canonicalizes a part number for consistent comparison and storage.
 * Rule: TRIM whitespace and convert to UPPERCASE.
 * @param partNumber The input part number to normalize.
 * @returns The normalized string, or empty string if input is null/undefined.
 */
export function normalizePartNumber(partNumber: string | null | undefined): string {
    if (!partNumber) return '';
    return partNumber.trim().toUpperCase();
}
