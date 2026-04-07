/**
 * Quote Numbering Utility
 * 
 * How it works:
 * - Quotes follow the format QYY-NNNN (e.g., Q26-0240, Q27-0001).
 * - `YY` is the last two digits of the current year.
 * - `NNNN` is a sequential number padded to 4 digits that resets every year.
 * - Duplicates follow Option A: they append an alphabetical suffix (e.g., Q26-0240-A, Q26-0240-B).
 * 
 * Where starting offsets are configured:
 * - The starting numbers for specific years can be adjusted in `lib/quote-number-config.ts`.
 * - This configuration only applies when the first quote of a given year is generated.
 * 
 * How yearly resets occur:
 * - A central database table `QuoteSequence` tracks the `lastNumber` for each `year`.
 * - When `generateNextQuoteNumber()` is called, it gets the current year.
 * - If a sequence record does not exist for the year, it creates one (applying the configurable starting offset if defined, or starting at 0).
 * - It then atomically increments the `lastNumber` for that year and formats the output.
 * 
 * Developer Control:
 * - To manually set the starting number (e.g., to Q26-0488), update the `QuoteSequence` table:
 *   `UPDATE "QuoteSequence" SET "lastNumber" = 487 WHERE "year" = 2026;`
 * - The next generated quote will be the value of `lastNumber + 1`.
 */

import prisma from './prisma';
import { QuoteSequenceConfig } from './quote-number-config';

/**
 * Generates the next sequential quote number for the current year.
 * @returns {Promise<string>} e.g., "Q26-0240"
 */
export async function generateNextQuoteNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const shortYear = currentYear.toString().slice(-2);

    let nextNumber = 1;

    // Use Prisma transaction to atomically lookup/create and update the sequence
    const result = await prisma.$transaction(async (tx) => {
        let sequence = await tx.quoteSequence.findUnique({
            where: { year: currentYear }
        });

        if (!sequence) {
            // Check config for a starting offset, default to 0 so the first number is +1 (i.e. 1)
            const startingOffset = QuoteSequenceConfig[currentYear] || 0;

            sequence = await tx.quoteSequence.create({
                data: {
                    year: currentYear,
                    lastNumber: startingOffset
                }
            });
        }

        // Atomically increment the sequence counter
        return await tx.quoteSequence.update({
            where: { year: currentYear },
            data: {
                lastNumber: {
                    increment: 1
                }
            }
        });
    });

    nextNumber = result.lastNumber;

    // Format: Q26-0240
    // Pad the sequential number with leading zeros to ensure it's at least 4 digits
    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `Q${shortYear}-${paddedNumber}`;
}

/**
 * Generates a revision number suffix for a quote.
 * e.g., "Q26-0243" -> "Q26-0243-A" -> "Q26-0243-B"
 * 
 * @param {string} originalQuoteNumber The quote number string to derive from.
 * @param {string} revisionGroupId The group ID to search within for existing suffixes.
 * @param {any} client Optional prisma/transaction client to use for querying.
 * @returns {Promise<string>} The new quote number with the next alphabetical suffix.
 */
export async function generateRevisionNumber(
    originalQuoteNumber: string, 
    revisionGroupId?: string,
    client: any = prisma
): Promise<string> {
    // Extract base number (e.g., "Q26-0243" from "Q26-0243-A")
    // We look for the standard QYY-NNNN pattern at the start
    const match = originalQuoteNumber.match(/^(Q\d{2}-\d{4})/);
    const baseNumber = match ? match[1] : originalQuoteNumber;

    // Determine existing suffixes in the group
    let existingSuffixes: string[] = [];

    // Search by prefix (baseNumber) to ensure global uniqueness across all groups.
    // Even if using revisionGroupId for logical grouping, quoteNumber-revision must be unique.
    const existingQuotes = await client.quote.findMany({
        where: {
            quoteNumber: { startsWith: baseNumber }
        },
        select: { quoteNumber: true }
    });

    for (const q of existingQuotes) {
        const suffix = extractSuffix(q.quoteNumber, baseNumber);
        if (suffix) existingSuffixes.push(suffix);
    }

    if (existingSuffixes.length === 0) {
        return `${baseNumber}-A`;
    }

    // Sort and get next (using Math.max for numbers converted from strings)
    const maxSuffixNum = existingSuffixes.reduce((max, suffix) => {
        const num = getSuffixNumber(suffix);
        return num > max ? num : max;
    }, 0);

    const nextSuffix = getNumberSuffix(maxSuffixNum + 1);

    return `${baseNumber}-${nextSuffix}`;
}

/**
 * Extracts the alphabetical suffix from a full quote number string.
 * e.g., ("Q26-0001-A", "Q26-0001") -> "A"
 */
function extractSuffix(fullNumber: string, baseNumber: string): string | null {
    const escapedBase = baseNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const suffixRegex = new RegExp(`^${escapedBase}-([A-Z]+)$`);
    const match = fullNumber.match(suffixRegex);
    return match ? match[1] : null;
}

/**
 * Converts alphabetical suffix (A, B... Z, AA) to a 1-based number.
 */
function getSuffixNumber(suffix: string): number {
    let num = 0;
    for (let i = 0; i < suffix.length; i++) {
        num = num * 26 + (suffix.charCodeAt(i) - 64);
    }
    return num;
}

/**
 * Converts a 1-based number to alphabetical suffix.
 */
function getNumberSuffix(num: number): string {
    let suffix = "";
    let n = num;
    while (n > 0) {
        let rem = (n - 1) % 26;
        suffix = String.fromCharCode(65 + rem) + suffix;
        n = Math.floor((n - rem) / 26);
    }
    return suffix;
}

/**
 * Synchronizes the QuoteSequence table with the highest quote number in the database for a given year.
 * Prevents unintentional backwards movement unless the highest number was explicitly deleted.
 * 
 * @param year The year to synchronize (e.g. 2026)
 * @param deletedNumber Optional numeric part of the quote that was permanently deleted
 */
export async function syncQuoteSequence(year: number, deletedNumber?: number) {
    const quoteNumbers = await prisma.quote.findMany({
        where: {
            quoteNumber: {
                startsWith: `Q${year.toString().slice(-2)}-`
            }
        },
        select: { quoteNumber: true }
    });

    let maxInDb = 0;
    const yearPrefix = `Q${year.toString().slice(-2)}-`;

    for (const q of quoteNumbers) {
        // Extract numeric part, ignoring revision suffixes (e.g. Q26-0243-A -> 243)
        const match = q.quoteNumber.match(/^Q\d{2}-(\d{4})/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxInDb) maxInDb = num;
        }
    }

    await prisma.$transaction(async (tx) => {
        let sequence = await tx.quoteSequence.findUnique({
            where: { year }
        });

        if (!sequence) {
            // If it doesn't exist, create it with the max if found, or use config/0
            const startingOffset = QuoteSequenceConfig[year] || 0;
            const initialNumber = Math.max(maxInDb, startingOffset);

            await tx.quoteSequence.create({
                data: {
                    year,
                    lastNumber: initialNumber
                }
            });
            return;
        }

        const currentSequence = sequence.lastNumber;

        // Stability Logic:
        // 1. If DB has a higher number than sequence (e.g. manual rename up) -> Sync forward
        if (maxInDb > currentSequence) {
            await tx.quoteSequence.update({
                where: { year },
                data: { lastNumber: maxInDb }
            });
        }
        // 2. If DB is lower than sequence AND we just deleted the tail -> Sync backward
        else if (maxInDb < currentSequence && deletedNumber === currentSequence) {
            await tx.quoteSequence.update({
                where: { year },
                data: { lastNumber: maxInDb }
            });
        }
        // Otherwise, leave unchanged (don't move back for non-tail deletions)
    });
}

/**
 * Trigger sequence synchronization for a given quote number.
 * 
 * @param quoteNumber The quote number to parse (e.g. Q26-0243)
 * @param isDeletion Boolean indicating if synchronization is triggered by permanent deletion
 */
export async function triggerSequenceSync(quoteNumber: string, isDeletion: boolean = false) {
    // Expected format QYY-NNNN...
    const match = quoteNumber.match(/^Q(\d{2})-(\d{4})/);
    if (!match) return;

    const shortYear = match[1];
    const numericPart = parseInt(match[2], 10);
    
    // Determine the full year (assuming 21st century)
    const currentYear = new Date().getFullYear();
    const yearPrefix = Math.floor(currentYear / 100) * 100;
    const fullYear = yearPrefix + parseInt(shortYear, 10);

    await syncQuoteSequence(fullYear, isDeletion ? numericPart : undefined);
}
