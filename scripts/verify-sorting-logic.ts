import { compareItems, SortableItem } from '../lib/sorting';

const testItems: SortableItem[] = [
    // 1. MCCB Accessories Mix (Should be Shield < Handle < Other)
    {
        name: 'LV429338T', // Rotary Handle
        partNumber: 'LV429338T',
        category: 'Switchboard',
        subcategory: 'Switchgear > MCCB Accessories',
        description: 'Rotary Handle Black',
        // Simulate missing structured segments for fallback test
    },
    {
        name: 'LV429517', // Terminal Shield
        partNumber: 'LV429517',
        category: 'Switchboard',
        subcategory: 'Switchgear > MCCB Accessories',
        description: 'Short Terminal Shield',
    },
    {
        name: 'AUX1',
        partNumber: 'AUX1',
        category: 'Switchboard',
        subcategory: 'Switchgear > MCCB Accessories',
        description: 'Auxiliary Contact',
    },

    // 2. Structured MCCB Accessories (Should use structure)
    {
        name: 'STRUCT_HANDLE',
        partNumber: 'STRUCT_HANDLE',
        category: 'Switchboard',
        subcategory: 'Switchgear > MCCB Accessories > Rotary Handles', // String fallback if segments fail
        categoryPathSegments: ['Switchgear', 'MCCB Accessories', 'Rotary Handles'],
        description: 'Structured Handle'
    },
    {
        name: 'STRUCT_SHIELD',
        partNumber: 'STRUCT_SHIELD',
        category: 'Switchboard',
        subcategory: 'Switchgear > MCCB Accessories > Terminal Shields',
        categoryPathSegments: ['Switchgear', 'MCCB Accessories', 'Terminal Shields'],
        description: 'Structured Shield'
    },

    // 3. Breakers (Fault Rating -> Current Rating)
    {
        name: 'B_36_100',
        category: 'Switchboard',
        subcategory: 'Switchgear > Circuit Breakers > MCCB > 36kA',
        description: 'NSX100F TM100D 3P 36kA 100A'
    },
    {
        name: 'B_25_250',
        category: 'Switchboard',
        subcategory: 'Switchgear > Circuit Breakers > MCCB > 25kA',
        description: 'NSX250B TM250D 3P 25kA 250A'
    },
    {
        name: 'B_25_100',
        category: 'Switchboard',
        subcategory: 'Switchgear > Circuit Breakers > MCCB > 25kA',
        description: 'NSX100B TM100D 3P 25kA 100A'
    },

    // 4. Basics vs Switchboard
    {
        name: 'BASIC_ITEM',
        category: 'Basics',
        subcategory: '1A-TIERS',
        description: 'Basic Item'
    }
];

console.log("Running Sorting Verification...");

const sorted = [...testItems].sort(compareItems);


import { getSortParts } from '../lib/sorting';

console.log("\nSorted Results with Parts:");
sorted.forEach((item, i) => {
    const parts = getSortParts(item);
    console.log(`${i}. [${item.category}] ${item.name} | Parts: ${JSON.stringify(parts)}`);
});

// Assertions
console.log("\nVerifying Order Rules...");


// Helper index finder
const idx = (name: string) => sorted.findIndex(i => i.name === name);

// Rule 1: Basics before Switchboard
if (idx('BASIC_ITEM') < idx('B_25_100')) console.log("✅ Basics < Switchboard");
else console.error("❌ Basics < Switchboard Failed");

// Rule 2: MCCB Accessories: Shield < Handle < Aux
// Fallback check
if (idx('LV429517') < idx('LV429338T')) console.log("✅ Shield < Handle (Fallback)");
else console.error("❌ Shield < Handle (Fallback) Failed");

if (idx('LV429338T') < idx('AUX1')) console.log("✅ Handle < Other");
else console.error("❌ Handle < Other Failed");

// Structured check
if (idx('STRUCT_SHIELD') < idx('STRUCT_HANDLE')) console.log("✅ Shield < Handle (Structured)");
else console.error("❌ Shield < Handle (Structured) Failed");


// Rule 3: Breakers: 25kA < 36kA
if (idx('B_25_100') < idx('B_36_100')) console.log("✅ 25kA < 36kA");
else console.error("❌ 25kA < 36kA Failed");

// Rule 4: Breakers: 100A < 250A (within 25kA)
if (idx('B_25_100') < idx('B_25_250')) console.log("✅ 100A < 250A");
else console.error("❌ 100A < 250A Failed");

console.log("\nDone.");
