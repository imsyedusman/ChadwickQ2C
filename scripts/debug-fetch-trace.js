// Simulate ItemSelection.tsx fetching logic for leaf nodes

const allSubcategories = [
    'Main Bars',
    'Main Bars > Custom Busbar',
    'Busbar Supports - Required for Custom Boards Only'
];

let selectedL1 = 'Busbar Supports - Required for Custom Boards Only';
let selectedL2 = null;
let selectedL3 = null;
let activeCategory = 'Busbar';

// 1. Calculate Options
const l1 = new Set();
const l2 = new Set();
const l3 = new Set();

allSubcategories.forEach(sub => {
    if (!sub) return;
    const parts = sub.split(' > ').map(s => s.trim()).filter(Boolean);

    if (parts.length > 0) l1.add(parts[0]);

    if (selectedL1 && parts[0] === selectedL1) {
        if (parts.length > 1) l2.add(parts[1]);
    }

    if (selectedL1 && selectedL2 && parts[0] === selectedL1 && parts[1] === selectedL2) {
        if (parts.length > 2) l3.add(parts[2]);
    }
});

const l2Options = Array.from(l2);
const l3Options = Array.from(l3);

console.log('--- FETCH LOGIC TRACE ---');
console.log('Selected L1:', selectedL1);
console.log('L2 Options:', l2Options);

// 2. Determine ShouldFetch
let shouldFetch = false;

if (activeCategory === 'Switchboard' || activeCategory === 'Busbar') {
    // Case 1: 3-level hierarchy (L3 selected)
    if (selectedL3) {
        console.log('Case 1: L3 selected -> FETCH');
        shouldFetch = true;
    }
    // Case 2: 2-level hierarchy (L2 selected, and no L3 options exist)
    else if (selectedL2 && l3Options.length === 0) {
        console.log('Case 2: L2 selected, no L3 -> FETCH');
        shouldFetch = true;
    }
    // Case 3: 1-level hierarchy (L1 selected, and no L2 options exist)
    else if (selectedL1 && l2Options.length === 0) {
        console.log('Case 3: L1 selected, no L2 -> FETCH');
        shouldFetch = true;
    } else {
        console.log('NO CASE MATCHED. shouldFetch = false');
        if (selectedL1 && l2Options.length > 0) {
            console.log('(Reason: L1 selected but L2 options exist, so waiting for L2)');
        }
    }
}

if (shouldFetch) {
    console.log('RESULT: SUCCESS - Would Fetch Items');
} else {
    console.log('RESULT: FAILURE - Would NOT Fetch Items');
}
