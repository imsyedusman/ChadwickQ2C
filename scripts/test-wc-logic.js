
// const fetch = require('node-fetch'); // Native fetch in Node 18+

const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log('Starting Whole-Current Metering Logic Test...');

    // 1. Get a Quote ID
    const quotesRes = await fetch(`${BASE_URL}/quotes`);
    const quotes = await quotesRes.json();
    if (quotes.length === 0) {
        console.error('No quotes found. Please create a quote first.');
        return;
    }
    const quoteId = quotes[0].id;
    console.log(`Using Quote ID: ${quoteId}`);

    // 2. Create a Board with WC Metering = Yes, Qty = 1
    console.log('\n--- Test 1: Create Board (WC=Yes, Qty=1) ---');
    const boardRes = await fetch(`${BASE_URL}/quotes/${quoteId}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test WC Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'No',
                meterPanel: 'No',
                wholeCurrentMetering: 'Yes',
                wcType: '100A wiring 3-phase',
                wcQuantity: 1,
                // Required fields
                location: 'Indoor', ipRating: 'IP42', form: '1', faultRating: '25kA', enclosureType: 'Mild Steel', currentRating: '63A', spd: 'No', drawingRef: 'No', notes: ''
            }
        })
    });
    const board = await boardRes.json();
    console.log(`Created Board ID: ${board.id}`);

    // Verify Items (Qty 1)
    await verifyItems(quoteId, board.id, 1);


    // 3. Update Board: Change Quantity to 3
    console.log('\n--- Test 2: Update Board (Qty=3) ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test WC Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'No',
                meterPanel: 'No',
                wholeCurrentMetering: 'Yes',
                wcType: '100A wiring 3-phase',
                wcQuantity: 3, // Changed
                location: 'Indoor', ipRating: 'IP42', form: '1', faultRating: '25kA', enclosureType: 'Mild Steel', currentRating: '63A', spd: 'No', drawingRef: 'No', notes: ''
            }
        })
    });
    await verifyItems(quoteId, board.id, 3);

    // 4. Update Board: Disable WC Metering
    console.log('\n--- Test 3: Update Board (WC=No) ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test WC Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'No',
                meterPanel: 'No',
                wholeCurrentMetering: 'No', // Changed
                wcType: '100A wiring 3-phase',
                wcQuantity: 3,
                location: 'Indoor', ipRating: 'IP42', form: '1', faultRating: '25kA', enclosureType: 'Mild Steel', currentRating: '63A', spd: 'No', drawingRef: 'No', notes: ''
            }
        })
    });
    await verifyItems(quoteId, board.id, 0);

    // Clean up
    console.log('\n--- Cleaning Up ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, { method: 'DELETE' });
    console.log('Board deleted.');
}

async function verifyItems(quoteId, boardId, n) {
    // Fetch Quote to get boards and items
    const res = await fetch(`${BASE_URL}/quotes/${quoteId}`);
    const quote = await res.json();
    const board = quote.boards.find(b => b.id === boardId);
    const items = board.items;

    console.log(`Verifying Items (N=${n})`);

    const checkItem = (partNumber, expectedQty) => {
        const item = items.find(i => i.name === partNumber);
        if (expectedQty > 0) {
            if (!item) console.error(`[FAIL] Missing item: ${partNumber}`);
            else if (item.quantity !== expectedQty) console.error(`[FAIL] Wrong quantity for ${partNumber}: ${item.quantity} (Expected: ${expectedQty})`);
            else console.log(`[PASS] Found ${partNumber} with Qty ${item.quantity}`);
        } else {
            if (item) console.error(`[FAIL] Item should NOT exist: ${partNumber}`);
            else console.log(`[PASS] ${partNumber} is absent`);
        }
    };

    if (n > 0) {
        checkItem('100A-FUSE', n * 3);
        checkItem('100A-PANEL', n);
        checkItem('100A-NEUTRAL-LINK', n);
        checkItem('100A-MCB-3PH', n);
        checkItem('100A-WIRING-3PH', 0); // Should NOT exist
    } else {
        checkItem('100A-FUSE', 0);
        checkItem('100A-PANEL', 0);
        checkItem('100A-NEUTRAL-LINK', 0);
        checkItem('100A-MCB-3PH', 0);
        checkItem('100A-WIRING-3PH', 0);
    }
}

runTest().catch(console.error);
