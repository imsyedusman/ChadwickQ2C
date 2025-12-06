export type BoardType = string;

export const BOARD_PREFIXES: Record<BoardType, string> = {
    'Main Switchboard (MSB)': 'MSB-',
    'Main Distribution Board (MDB)': 'MDB-',
    'Distribution Board (DB)': 'DB-',
    'Prewired Whole Current Meter Panel': 'WC-',
    'Supply Authority CT Metering Enclosure 200-400A': 'CT-',
    'Tee-Off-Box Riser': 'TOB-',
    'Tee-Off-Box End of Run': 'TOB-',
    'Remote Meter Panel with Test Block': 'RMP-'
};

export function getPrefixForType(type: string): string | null {
    return BOARD_PREFIXES[type] || null;
}

export function applyBoardPrefix(type: string, name: string): string {
    const prefix = getPrefixForType(type);
    if (!prefix) return name; // No prefix defined for this type

    const trimmedName = name.trim();

    // Case 1: Empty name -> Default
    if (!trimmedName) {
        return `${prefix}01`;
    }

    // Case 2: Already starts with correct prefix -> Return as is (just trimmed)
    if (trimmedName.startsWith(prefix)) {
        return trimmedName;
    }

    // Case 3: Starts with a DIFFERENT known prefix -> Swap it
    // We iterate all known prefixes to find if one matches the start
    const knownPrefixes = Object.values(BOARD_PREFIXES);
    const matchedPrefix = knownPrefixes.find(p => p && trimmedName.startsWith(p));

    if (matchedPrefix) {
        // Swap matched prefix with new prefix
        // e.g. "MSB-Main" (matched MSB-) -> "DB-Main" (new DB-)
        return prefix + trimmedName.slice(matchedPrefix.length);
    }

    // Case 4: No known prefix -> Prepend
    // e.g. "Main Board" -> "DB-Main Board"
    return prefix + trimmedName;
}
