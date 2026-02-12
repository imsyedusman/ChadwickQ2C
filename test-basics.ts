
import { getSystemItemExplanation } from './lib/system-explanations';
import { Item } from './context/QuoteContext';
import assert from 'assert';

const createItem = (overrides: Partial<Item> = {}): Item => ({
    id: 'test-basics',
    boardId: 'board-1',
    category: 'Basics',
    name: '1A-TIERS',
    isSystemManaged: false,
    isDefault: true,
    quantity: 1,
    unitPrice: 100,
    labourHours: 0,
    cost: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    order: 0,
    notes: '',
    ...overrides
} as Item);

console.log("Running Basics Explanation Verification...");

const basicsItem = createItem();
const explanation = getSystemItemExplanation(basicsItem, []);

console.log('Basics Item Explanation:', explanation);

assert(explanation.ruleName === 'STANDARD_BASE_INCLUSION', 'Rule Name mismatch for Basics');
assert(explanation.handler === 'createQuote/Board (Template)', 'Handler mismatch for Basics');

console.log("Verification Passed.");
