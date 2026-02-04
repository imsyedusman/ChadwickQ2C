
// Self-contained test for deriveVariant logic
// Copies logic from lib/automation.ts

function deriveVariant(item: { category: string, subcategory: string | null, productFrame: string | null, name: string }): string | null {
    // 1. Check Subcategory/Category strings for explicit variants
    const contextString = `${item.category} ${item.subcategory || ''} ${item.name}`.toUpperCase();

    // Priority Ordered Variants
    // Note: Longer matches first if overlaps exist? 
    // "1600N" vs "600N" (not an issue here)
    const VARIANTS = ['B3', 'F3', 'N3', 'H3', '630BN', '800N', '1000N', '1250N', '1600N'];

    for (const v of VARIANTS) {
        if (contextString.includes(v)) {
            return v === '630BN' ? '630bN' : v;
        }
    }

    // Special Case: SAU Chassis
    if (item.name.startsWith('SAU')) {
        return 'SAU';
    }

    return null;
}

const testCases = [
    {
        item: { category: 'Switchboard', subcategory: 'MCCB B3 Variant', name: 'C1035E100', productFrame: null },
        expected: 'B3'
    },
    {
        item: { category: 'Switchboard', subcategory: 'Switchgear > Circuit Breakers > MCCB F3', name: 'SomeF3Item', productFrame: null },
        expected: 'F3'
    },
    {
        item: { category: 'Switchboard', subcategory: 'Switchgear > Circuit Breakers > MCCB 250A', name: 'ItemWithH3InName', productFrame: null },
        expected: 'H3'
    },
    {
        item: { category: 'Switchboard', subcategory: 'Switchgear > Circuit Breakers > MCCB 630bN', name: 'BigBreaker', productFrame: null },
        expected: '630bN'
    },
    {
        item: { category: 'Switchboard', subcategory: 'Switchgear > Chassis', name: 'SAU25018', productFrame: null },
        expected: 'SAU'
    },
    {
        item: { category: 'Switchboard', subcategory: 'Regular Breaker', name: 'NoVariant', productFrame: null },
        expected: null
    }
];

console.log('Running Variant Derivation Tests...');
let failures = 0;
testCases.forEach((tc, i) => {
    const res = deriveVariant(tc.item);
    if (res !== tc.expected) {
        console.error(`FAIL [${i}]: Expected ${tc.expected}, got ${res}`);
        console.error('Item:', tc.item);
        failures++;
    } else {
        console.log(`PASS [${i}]: ${res}`);
    }
});

if (failures > 0) process.exit(1);
console.log('All Tests Passed.');
