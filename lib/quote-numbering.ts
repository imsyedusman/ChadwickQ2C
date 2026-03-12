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
 * Generates a revision number suffix for a duplicated quote.
 * e.g., "Q26-0240" -> "Q26-0240-A" -> "Q26-0240-B"
 * 
 * @param {string} originalQuoteNumber The base quote number to duplicate.
 * @returns {Promise<string>} The new quote number with the next alphabetical suffix.
 */
export async function generateRevisionNumber(originalQuoteNumber: string): Promise<string> {
    // Extract base number (e.g., "Q26-0243" from "Q26-0243-A")
    // We look for the standard QYY-NNNN pattern at the start
    const match = originalQuoteNumber.match(/^(Q\d{2}-\d{4})/);
    const baseNumber = match ? match[1] : originalQuoteNumber;

    // Find all existing quotes that start with this base number
    const existingQuotes = await prisma.quote.findMany({
        where: {
            quoteNumber: {
                startsWith: baseNumber
            }
        },
        select: { quoteNumber: true }
    });

    if (existingQuotes.length === 0) {
        // Fallback: If for some reason the original doesn't exist, just start with -A
        return `${baseNumber}-A`;
    }

    // Determine the highest existing suffix
    const existingSuffixes: string[] = [];

    for (const q of existingQuotes) {
        // Match suffixes like -A, -B, -Z, -AA at the end of the base number
        // We escape the baseNumber just in case it contains special characters
        const escapedBase = baseNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const suffixRegex = new RegExp(`^${escapedBase}-([A-Z]+)$`);
        const suffixMatch = q.quoteNumber.match(suffixRegex);

        if (suffixMatch && suffixMatch[1]) {
            existingSuffixes.push(suffixMatch[1]);
        }
    }

    if (existingSuffixes.length === 0) {
        // No suffixes yet, just the base
        return `${baseNumber}-A`;
    }

    // Sort suffixes to find the highest logically
    // To sort alphabetical suffixes correctly (A, B, C... Z, AA, AB), we can convert back to numbers
    const getSuffixNumber = (suffix: string): number => {
        let num = 0;
        for (let i = 0; i < suffix.length; i++) {
            num = num * 26 + (suffix.charCodeAt(i) - 64);
        }
        return num;
    };

    const getNumberSuffix = (num: number): string => {
        let suffix = "";
        while (num > 0) {
            let rem = (num - 1) % 26;
            suffix = String.fromCharCode(65 + rem) + suffix;
            num = Math.floor((num - rem) / 26);
        }
        return suffix;
    };

    let maxSuffixNum = 0;
    for (const suffix of existingSuffixes) {
        const num = getSuffixNumber(suffix);
        if (num > maxSuffixNum) {
            maxSuffixNum = num;
        }
    }

    // Next suffix
    const nextSuffix = getNumberSuffix(maxSuffixNum + 1);

    return `${baseNumber}-${nextSuffix}`;
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
