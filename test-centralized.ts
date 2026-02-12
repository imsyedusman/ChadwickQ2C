
import { getSystemItemExplanation } from './lib/system-explanations';
import { Item } from './context/QuoteContext';
import assert from 'assert';

// Mock Item Factory
const createItem = (overrides: Partial<Item> = {}): Item => ({
    id: 'test-id',
    boardId: 'board-1',
    category: 'Switchboard',
    subcategory: 'MCCB',
    name: 'Test Item',
    quantity: 1,
    unitPrice: 100,
    labourHours: 1,
    cost: 100,
    isSystemManaged: false,
    isDefault: false,
    isSheetmetal: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: 0,
    notes: '',
    ...overrides
} as Item);

async function runTests() {
    console.log("Running System Explanations Verification...");
    let passed = 0;

    // Test 1: New Metadata-Driven Explanation (MCCB Accessory)
    const newShield = createItem({
        isSystemManaged: true,
        systemRuleType: 'MCCB_ACCESSORY_SHIELD',
        systemTag: 'MCCB_ACCESSORIES' // Legacy tag still present usually
    });
    const res1 = getSystemItemExplanation(newShield, []);

    console.log('Result 1:', res1);

    assert(res1.reason === 'Required for MCCB (Terminal Shield).', "Metadata: Reason mismatch");
    assert(res1.calculation === '2 Shields per Breaker (Line & Load).', "Metadata: Calculation mismatch");
    assert(res1.ruleName === 'MCCB_ACCESSORY_SHIELD', "Metadata: RuleName mismatch");
    assert(res1.handler === 'syncBoardAccessories', "Metadata: Handler mismatch");
    passed++;

    // Test 2: Legacy Fallback (ATS Accessory without ruleType)
    const atsBreaker = createItem({
        partNumber: 'BLV429632/29642',
        name: 'ATS Breaker',
        quantity: 1,
        isSystemManaged: false
    });
    const legacyAts = createItem({
        isSystemManaged: true,
        systemTag: 'ATS_ACCESSORIES',
        partNumber: '29472',
        systemRuleType: null // Simulating old item
    });
    const res2 = getSystemItemExplanation(legacyAts, [atsBreaker, legacyAts]);

    console.log('Result 2:', res2);

    assert(res2.reason.includes("Required for ATS Breaker"), "Legacy ATS: Reason match failed");
    assert(res2.ruleName === "ATS_ACCESSORIES_LINK_RULE", "Legacy ATS: RuleName match failed");
    assert(res2.handler && res2.handler.includes("Legacy"), "Legacy ATS: Handler should indicate legacy");
    passed++;

    console.log(`\nTests Completed: ${passed} Passed.`);
}

runTests().catch(e => {
    console.error("Test Failed:");
    console.error(e);
    process.exit(1);
});
