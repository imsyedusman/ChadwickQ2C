export function normalizeSubcategory(subcategory: string | null | undefined, category?: string | null): string[] {
    if (!subcategory) return ['Other'];
    
    let parts = subcategory.split(' > ').map(s => s.trim()).filter(Boolean);
    
    if (category === 'Switchboard') {
        // 1. Strip "Switchgear" root if present
        if (parts[0] === 'Switchgear') {
            parts.shift();
        }

        if (parts.length === 0) return ['Miscellaneous', 'Others'];

        // 2. Map everything to the 3-level root: Circuit Breakers, Switches, Miscellaneous
        const topLevel = parts[0];
        const L1_TARGETS = ['Circuit Breakers', 'Switches', 'Miscellaneous'];
        const MISC_TARGETS = ['Contactor', 'General Control', 'Power Metering', 'Fuses'];

        if (!L1_TARGETS.includes(topLevel)) {
            // It belongs under Miscellaneous
            parts = ['Miscellaneous', ...parts];
        } else if (topLevel === 'Miscellaneous' && parts.length === 1) {
            parts = ['Miscellaneous', 'Uncategorized'];
        }
    }

    if (category === 'Busbar') {
        if (parts.length > 0 && !parts[0].startsWith('Main Bars')) {
            if (parts[0] !== 'Miscellaneous') {
                parts = ['Miscellaneous', ...parts];
            }
        }
    }

    return parts;
}

export function formatSubcategoryLabel(subcategory: string | null | undefined, category?: string | null): string {
    const parts = normalizeSubcategory(subcategory, category);
    return parts.join(' > ');
}
