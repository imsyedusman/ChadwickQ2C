
import { getSystemItemExplanation } from './lib/system-explanations';
import { Item } from './context/QuoteContext'; // We might need to mock this if it's not a pure type
import { ATS_BREAKER_GROUPS } from './lib/automation';

// Mock Item Factory
const createItem = (overrides: Partial<Item>): Item => ({
    id: 'test-id',
    boardId: 'test-board',
    category: 'Switchboard',
    subcategory: null,
    name: 'Test Item',
    description: 'Test Desc',
    quantity: 1,
    unitPrice: 100,
    labourHours: 1,
    cost: 100,
    isDefault: false,
    notes: null,
    isSystemManaged: false,
    ...overrides
}) as Item;

// Mock Data
const atsBreaker = createItem({
    name: 'ATS Breaker',
    partNumber: ATS_BREAKER_GROUPS.GROUP_1_100_250[0], // BLV429632/29642
    productFrame: 'NSX100-250',
    quantity: 1
});

const atsAccessory = createItem({
    name: '29472', // Logic Panel
    isSystemManaged: true,
    systemTag: 'ATS_ACCESSORIES',
    partNumber: '29472'
});

const nsxBreaker = createItem({
    name: 'NSX100 Breaker',
    partNumber: 'LV429630',
    productFrame: 'NSX100-250',
    quantity: 3
});

const nsxShield = createItem({
    name: 'LV429517',
    isSystemManaged: true,
    systemTag: 'MCCB_ACCESSORIES',
    productFrame: 'NSX100-250'
});

async function runTests() {
    console.log("Running System Explanation Tests...");
    let passed = 0;
    let failed = 0;

    const assert = (condition: boolean, msg: string) => {
        if (condition) {
            console.log(`✅ ${msg}`);
            passed++;
        } else {
            console.error(`❌ ${msg}`);
            failed++;
        }
    };

    // Test 1: ATS Accessory
    const atsResult = getSystemItemExplanation(atsAccessory, [atsBreaker, atsAccessory]);
    assert(atsResult.reason.includes("Required for ATS Breaker"), "ATS: Reason should mention ATS Breaker");
    // Flexible assertion for updated calculation logic
    assert(atsResult.calculation.includes("Matches the total quantity") || atsResult.calculation.includes("1:1"), "ATS: Calculation should mention quantity match");
    assert(atsResult.ruleName === "ATS_ACCESSORIES_LINK_RULE", "ATS: Rule Name should be ATS_ACCESSORIES_LINK_RULE");

    // Test 2: MCCB Accessory (Shield)
    const mccbResult = getSystemItemExplanation(nsxShield, [nsxBreaker, nsxShield]);
    assert(mccbResult.reason.includes("Required for NSX100-250"), "MCCB: Reason should mention NSX100-250");
    assert(mccbResult.calculation.includes("2 per breaker"), "MCCB: Shield should be 2 per breaker");
    assert(mccbResult.calculation.includes("Total breakers found: 3"), "MCCB: Should count 3 breakers");
    assert(mccbResult.ruleName.includes("MCCB_ACCESSORY"), "MCCB: Rule Name should include MCCB_ACCESSORY");

    // Test 3: Manual Item (Ignore)
    const manualResult = getSystemItemExplanation(nsxBreaker, []); // It's not system managed
    assert(manualResult.reason.includes("manually added"), "Manual: Should be identified as manual");
    assert(manualResult.ruleName === "MANUAL_ENTRY", "Manual: Rule Name should be MANUAL_ENTRY");

    // Test 4: Generic System Item
    const genericItem = createItem({ isSystemManaged: true, systemTag: 'UNKNOWN_TAG' });
    const genericResult = getSystemItemExplanation(genericItem, []);
    assert(genericResult.reason.includes("automatically managed"), "Generic: Should show generic message");
    assert(genericResult.ruleName === "UNKNOWN_TAG", "Generic: Rule Name should match generic tag");

    console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed.`);
}

runTests().catch(console.error);
