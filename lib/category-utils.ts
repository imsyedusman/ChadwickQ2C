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

        // 4. Nested Accessories for Circuit Breakers
        if (parts[0] === 'Circuit Breakers') {
            const cbAccessoryMappings: Record<string, string[]> = {
                'ACB Accessories': ['ACB', 'ACB Accessories'],
                'ATS Accessories': ['ATS', 'ATS Accessories'],
                'MCB Accessories': ['MCB', 'MCB Accessories']
            };

            const l2 = parts[1];
            if (cbAccessoryMappings[l2]) {
                parts.splice(1, 1, ...cbAccessoryMappings[l2]);
            } else if (l2 === 'ATS' && parts[2] === 'Accessories') {
                parts[2] = 'ATS Accessories';
            } else if (l2 === 'MCB' && parts[2] === 'Accessories') {
                parts[2] = 'MCB Accessories';
            }
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
