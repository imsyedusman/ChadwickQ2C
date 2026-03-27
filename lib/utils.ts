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
 * Format a quote number with an alphabetical suffix based on its revision.
 * @param quoteNumber - Base quote number e.g. "Q26-0240"
 * @param revision - Integer revision, used for DB uniqueness in duplicates.
 * @param id - The unique ID of the quote.
 * @param revisionGroupId - The ID of the revision group root.
 */
export function formatQuoteNumber(
  quoteNumber: string, 
  revision: number = 0, 
  id?: string, 
  revisionGroupId?: string | null
): string {
  // If the quoteNumber already has a suffix in the string (e.g. -A, -B), use it as is.
  if (quoteNumber.match(/-[A-Z]+$/)) return quoteNumber;

  // Independent quotes (where revisionGroupId is null or same as its own id)
  // should NEVER show an alphabetical suffix even if revision > 0.
  // The revision integer is strictly for DB uniqueness in these cases.
  if (!revisionGroupId || revisionGroupId === id || revision === 0) {
    return quoteNumber;
  }

  // Otherwise, it's a revision member that needs a suffix generated from its revision number.
  // Note: Most new revisions will store the suffix in the quoteNumber string directly.
  let suffix = "";
  let r = revision;
  while (r > 0) {
    const remainder = (r - 1) % 26;
    suffix = String.fromCharCode(65 + remainder) + suffix;
    r = Math.floor((r - 1) / 26);
  }
  return `${quoteNumber}-${suffix}`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}
