
// const fetch = require('node-fetch'); // Native fetch in Node 18+

const BASE_URL = 'http://localhost:3000/api';
// You might need to find a valid quote ID first.
// Let's assume we can list quotes or just use a hardcoded one if we knew it.
// Better to fetch quotes first.

async function runTest() {
    console.log('Starting CT Metering Logic Test...');

    // 1. Get a Quote ID
    const quotesRes = await fetch(`${BASE_URL}/quotes`);
    const quotes = await quotesRes.json();
    if (quotes.length === 0) {
        console.error('No quotes found. Please create a quote first.');
        return;
    }
    const quoteId = quotes[0].id;
    console.log(`Using Quote ID: ${quoteId}`);

    // 2. Create a Board with CT Metering = Yes, Type = S, Qty = 2
    console.log('\n--- Test 1: Create Board (CT=Yes, Type=S, Qty=2) ---');
    const boardRes = await fetch(`${BASE_URL}/quotes/${quoteId}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test CT Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'Yes',
                ctType: 'S',
                ctQuantity: 2,
                meterPanel: 'No',
                // Required fields
                location: 'Indoor',
                ipRating: 'IP42',
                form: '1',
                faultRating: '25kA',
                enclosureType: 'Mild Steel',
                currentRating: '63A',
                spd: 'No',
                wholeCurrentMetering: 'No',
                drawingRef: 'No',
                notes: ''
            }
        })
    });
    const board = await boardRes.json();
    console.log(`Created Board ID: ${board.id}`);

    // Verify Items
    await verifyItems(quoteId, board.id, 2, 'S');


    // 3. Update Board: Change Type to T
    console.log('\n--- Test 2: Update Board (Type=T) ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test CT Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'Yes',
                ctType: 'T', // Changed
                ctQuantity: 2,
                meterPanel: 'No',
                location: 'Indoor', ipRating: 'IP42', form: '1', faultRating: '25kA', enclosureType: 'Mild Steel', currentRating: '63A', spd: 'No', wholeCurrentMetering: 'No', drawingRef: 'No', notes: ''
            }
        })
    });
    await verifyItems(quoteId, board.id, 2, 'T');

    // 4. Update Board: Change Quantity to 5
    console.log('\n--- Test 3: Update Board (Qty=5) ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test CT Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'Yes',
                ctType: 'T',
                ctQuantity: 5, // Changed
                meterPanel: 'No',
                location: 'Indoor', ipRating: 'IP42', form: '1', faultRating: '25kA', enclosureType: 'Mild Steel', currentRating: '63A', spd: 'No', wholeCurrentMetering: 'No', drawingRef: 'No', notes: ''
            }
        })
    });
    await verifyItems(quoteId, board.id, 5, 'T');

    // 5. Update Board: Enable Meter Panel
    console.log('\n--- Test 4: Update Board (Meter Panel=Yes) ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test CT Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'Yes',
                ctType: 'T',
                ctQuantity: 5,
                meterPanel: 'Yes', // Changed
                location: 'Indoor', ipRating: 'IP42', form: '1', faultRating: '25kA', enclosureType: 'Mild Steel', currentRating: '63A', spd: 'No', wholeCurrentMetering: 'No', drawingRef: 'No', notes: ''
            }
        })
    });
    await verifyItems(quoteId, board.id, 5, 'T', true);

    // 6. Update Board: Disable CT Metering
    console.log('\n--- Test 5: Update Board (CT=No) ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test CT Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'No', // Changed
                ctType: 'T',
                ctQuantity: 5,
                meterPanel: 'No', // Also disabled for clean check
                location: 'Indoor', ipRating: 'IP42', form: '1', faultRating: '25kA', enclosureType: 'Mild Steel', currentRating: '63A', spd: 'No', wholeCurrentMetering: 'No', drawingRef: 'No', notes: ''
            }
        })
    });
    await verifyItems(quoteId, board.id, 0, null);

    // Clean up
    console.log('\n--- Cleaning Up ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, { method: 'DELETE' });
    console.log('Board deleted.');
}

async function verifyItems(quoteId, boardId, expectedQty, expectedType, hasMeterPanel = false) {
    // Fetch Quote to get boards and items
    const res = await fetch(`${BASE_URL}/quotes/${quoteId}`);
    const quote = await res.json();
    const board = quote.boards.find(b => b.id === boardId);
    const items = board.items;

    console.log(`Verifying Items (Expected Qty: ${expectedQty}, Type: ${expectedType}, MeterPanel: ${hasMeterPanel})`);

    const checkItem = (partNumber, shouldExist) => {
        const item = items.find(i => i.name === partNumber); // Assuming name is partNumber for these
        if (shouldExist) {
            if (!item) console.error(`[FAIL] Missing item: ${partNumber}`);
            else if (item.quantity !== expectedQty) console.error(`[FAIL] Wrong quantity for ${partNumber}: ${item.quantity} (Expected: ${expectedQty})`);
            else console.log(`[PASS] Found ${partNumber} with Qty ${item.quantity}`);
        } else {
            if (item) console.error(`[FAIL] Item should NOT exist: ${partNumber}`);
            else console.log(`[PASS] ${partNumber} is absent`);
        }
    };

    if (expectedQty > 0) {
        checkItem('CT-COMPARTMENTS', true);
        checkItem('CT-PANEL', true);
        checkItem('CT-TEST-BLOCK', true);
        checkItem('CT-WIRING', true);

        checkItem('CT-S-TYPE', expectedType === 'S');
        checkItem('CT-T-TYPE', expectedType === 'T');
        checkItem('CT-W-TYPE', expectedType === 'W');
        checkItem('CT-U-TYPE', expectedType === 'U');

        checkItem('100A-PANEL', hasMeterPanel);
    } else {
        // All should be gone
        checkItem('CT-COMPARTMENTS', false);
        checkItem('CT-PANEL', false);
        checkItem('CT-TEST-BLOCK', false);
        checkItem('CT-WIRING', false);
        checkItem('CT-S-TYPE', false);
        checkItem('CT-T-TYPE', false);
        checkItem('100A-PANEL', false);
    }
}

runTest().catch(console.error);
