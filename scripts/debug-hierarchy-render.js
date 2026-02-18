// Simulate ItemSelection.tsx hierarchy logic

const allSubcategories = [
    'Main Bars',
    'Main Bars > Custom Busbar',
    'Busbar Supports - Required for Custom Boards Only'
];

// Current State
let selectedL1 = null;
let selectedL2 = null;
let selectedL3 = null;

function renderOptions() {
    const l1 = new Set();
    const l2 = new Set();
    const l3 = new Set();

    allSubcategories.forEach(sub => {
        if (!sub) return;
        // Verify split logic
        const parts = sub.split(' > ').map(s => s.trim()).filter(Boolean);

        console.log(`Processing "${sub}" -> parts:`, parts);

        if (parts.length > 0) l1.add(parts[0]);

        if (selectedL1 && parts[0] === selectedL1) {
            if (parts.length > 1) l2.add(parts[1]);
        }

        if (selectedL1 && selectedL2 && parts[0] === selectedL1 && parts[1] === selectedL2) {
            if (parts.length > 2) l3.add(parts[2]);
        }
    });

    return {
        l1: Array.from(l1).sort(),
        l2: Array.from(l2).sort(),
        l3: Array.from(l3).sort()
    };
}

console.log('--- HIERARCHY SIMULATION ---');
console.log('1. Initial State (No Selection)');
const res1 = renderOptions();
console.log('L1 Options:', res1.l1);

if (!res1.l1.includes('Busbar Supports - Required for Custom Boards Only')) {
    console.log('FAILURE: Cleat subcat NOT in L1 options');
} else {
    console.log('SUCCESS: Cleat subcat IS in L1 options');
}

console.log('\n2. Simulate Selection');
selectedL1 = 'Busbar Supports - Required for Custom Boards Only';
const res2 = renderOptions();
console.log('Selected L1:', selectedL1);
console.log('L2 Options (Should be empty):', res2.l2);

if (res2.l2.length === 0) {
    console.log('SUCCESS: No L2 options, so drill-down is complete.');
}
