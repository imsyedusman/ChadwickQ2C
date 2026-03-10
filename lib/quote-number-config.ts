/**
 * QuoteSequenceConfig
 * 
 * Used to define the starting number for a specific year.
 * Example:
 * 2026: 239 -> next generated quote becomes Q26-0240
 * 
 * IMPORTANT:
 * This value is only used when the sequence for a year is created.
 * If a sequence already exists in the database, changing this file will NOT affect numbering.
 */
export const QuoteSequenceConfig: Record<number, number> = {
    2026: 239, // so that +1 starts at 240
};
