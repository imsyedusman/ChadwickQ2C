export function normalizeSubcategory(subcategory: string | null | undefined, category?: string | null): string[] {
    if (!subcategory) return ['Other'];
    
    let parts = subcategory.split(' > ').map(s => s.trim()).filter(Boolean);
    
    if (category === 'Switchboard') {
        // 1. Strip "Switchgear" root if present (legacy)
        if (parts[0] === 'Switchgear') {
            parts.shift();
        }

        if (parts.length === 0) return ['Miscellaneous', 'Others'];

        // 2. Standardize naming
        parts = parts.map(p => p === 'Power Meters' ? 'Power Metering' : p);
        parts = parts.map(p => p === 'Control' ? 'General Control' : p);

        // 3. Ensure L1 is one of the standard roots
        const L1_TARGETS = ['Circuit Breakers', 'Switches', 'Miscellaneous'];
        if (!L1_TARGETS.includes(parts[0])) {
            // This shouldn't happen much after migration, but keep as failsafe
            parts = ['Miscellaneous', ...parts];
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
