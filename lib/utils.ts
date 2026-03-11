import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency with thousands separators
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string like "$1,234.56"
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

/**
 * Format a quote number with an alphabetical suffix based on its revision
 * @param quoteNumber - Base quote number e.g. "Q26-0240"
 * @param revision - Integer revision, 0 means no suffix, 1 means "-A"
 */
export function formatQuoteNumber(quoteNumber: string, revision: number = 0): string {
  if (!revision || revision === 0) return quoteNumber;

  // If the quoteNumber already has a suffix (e.g. -A, -B), don't add another one
  if (quoteNumber.match(/-[A-Z]+$/)) return quoteNumber;

  let suffix = "";
  let r = revision;
  while (r > 0) {
    const remainder = (r - 1) % 26;
    suffix = String.fromCharCode(65 + remainder) + suffix;
    r = Math.floor((r - 1) / 26);
  }
  return `${quoteNumber}-${suffix}`;
}
