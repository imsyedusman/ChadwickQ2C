
// const fetch = require('node-fetch'); // Native fetch in Node 18+

const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log('Starting CT Metering Logic Test (with Busbar & Labour)...');

    // 1. Get a Quote ID
    const quotesRes = await fetch(`${BASE_URL}/quotes`);
    const quotes = await quotesRes.json();
    if (quotes.length === 0) {
        console.error('No quotes found. Please create a quote first.');
        return;
    }
    const quoteId = quotes[0].id;
    console.log(`Using Quote ID: ${quoteId}`);

    // 2. Create a Board with CT Metering = Yes, Type = S, Qty = 2, Current = 400A, Enclosure = Custom
    console.log('\n--- Test 1: Create Board (CT=Yes, Type=S, Qty=2, Current=400A, Enclosure=Custom) ---');
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
                enclosureType: 'Custom',
                material: 'Mild Steel',
                currentRating: '400A',
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
    await verifyItems(quoteId, board.id, {
        ctQty: 2,
        ctType: 'S',
        busbar: 'BB-400A',
        labour: 'CT-400A'
    });

    // 3. Update Board: Change Enclosure Type to Cubic
    console.log('\n--- Test 2: Update Board (Enclosure=Cubic) ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test CT Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'Yes',
                ctType: 'S',
                ctQuantity: 2,
                meterPanel: 'No',
                location: 'Indoor',
                ipRating: 'IP42',
                form: '1',
                faultRating: '25kA',
                enclosureType: 'Cubic', // Changed
                material: 'Mild Steel',
                currentRating: '400A',
                spd: 'No',
                wholeCurrentMetering: 'No',
                drawingRef: 'No',
                notes: ''
            }
        })
    });
    await verifyItems(quoteId, board.id, {
        ctQty: 2,
        ctType: 'S',
        busbar: 'BBC-400A-2', // Changed to Cubic
        labour: 'CT-400A'
    });

    // 4. Update Board: Change Current Rating to 800A
    console.log('\n--- Test 3: Update Board (Current=800A) ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test CT Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'Yes',
                ctType: 'S',
                ctQuantity: 2,
                meterPanel: 'No',
                location: 'Indoor',
                ipRating: 'IP42',
                form: '1',
                faultRating: '25kA',
                enclosureType: 'Cubic',
                material: 'Mild Steel',
                currentRating: '800A', // Changed
                spd: 'No',
                wholeCurrentMetering: 'No',
                drawingRef: 'No',
                notes: ''
            }
        })
    });
    await verifyItems(quoteId, board.id, {
        ctQty: 2,
        ctType: 'S',
        busbar: 'BBC-800A-2', // Changed to 800A
        labour: 'CT-800A' // Changed to 800A
    });

    // 5. Update Board: Change Quantity to 5
    console.log('\n--- Test 4: Update Board (Qty=5) ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test CT Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ctMetering: 'Yes',
                ctType: 'S',
                ctQuantity: 5, // Changed
                meterPanel: 'No',
                location: 'Indoor',
                ipRating: 'IP42',
                form: '1',
                faultRating: '25kA',
                enclosureType: 'Cubic',
                material: 'Mild Steel',
                currentRating: '800A',
                spd: 'No',
                wholeCurrentMetering: 'No',
                drawingRef: 'No',
                notes: ''
            }
        })
    });
    await verifyItems(quoteId, board.id, {
        ctQty: 5, // Changed
        ctType: 'S',
        busbar: 'BBC-800A-2',
        labour: 'CT-800A'
    });

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
                ctType: 'S',
                ctQuantity: 5,
                meterPanel: 'No',
                location: 'Indoor',
                ipRating: 'IP42',
                form: '1',
                faultRating: '25kA',
                enclosureType: 'Cubic',
                material: 'Mild Steel',
                currentRating: '800A',
                spd: 'No',
                wholeCurrentMetering: 'No',
                drawingRef: 'No',
                notes: ''
            }
        })
    });
    await verifyItems(quoteId, board.id, {
        ctQty: 0, // All CT items should be removed
        ctType: null,
        busbar: null,
        labour: null
    });

    // Clean up
    console.log('\n--- Cleaning Up ---');
    await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${board.id}`, { method: 'DELETE' });
    console.log('Board deleted.');
    console.log('\n✅ All tests completed!');
}

async function verifyItems(quoteId, boardId, expected) {
    // Fetch Quote to get boards and items
    const res = await fetch(`${BASE_URL}/quotes/${quoteId}`);
    const quote = await res.json();
    const board = quote.boards.find(b => b.id === boardId);
    const items = board.items;

    console.log(`Verifying Items (Expected Qty: ${expected.ctQty}, Type: ${expected.ctType}, Busbar: ${expected.busbar}, Labour: ${expected.labour})`);

    const checkItem = (partNumber, shouldExist, expectedQty) => {
        const item = items.find(i => i.name === partNumber);
        if (shouldExist) {
            if (!item) {
                console.error(`[FAIL] Missing item: ${partNumber}`);
            } else if (item.quantity !== expectedQty) {
                console.error(`[FAIL] Wrong quantity for ${partNumber}: ${item.quantity} (Expected: ${expectedQty})`);
            } else {
                console.log(`[PASS] Found ${partNumber} with Qty ${item.quantity}`);
            }
        } else {
            if (item) {
                console.error(`[FAIL] Item should NOT exist: ${partNumber}`);
            } else {
                console.log(`[PASS] ${partNumber} is absent`);
            }
        }
    };

    if (expected.ctQty > 0) {
        // Check base CT items
        checkItem('CT-COMPARTMENTS', true, expected.ctQty);
        checkItem('CT-PANEL', true, expected.ctQty);
        checkItem('CT-TEST-BLOCK', true, expected.ctQty);
        checkItem('CT-WIRING', true, expected.ctQty);

        // Check CT Type
        checkItem('CT-S-TYPE', expected.ctType === 'S', expected.ctQty);
        checkItem('CT-T-TYPE', expected.ctType === 'T', expected.ctQty);
        checkItem('CT-W-TYPE', expected.ctType === 'W', expected.ctQty);
        checkItem('CT-U-TYPE', expected.ctType === 'U', expected.ctQty);

        // Check Busbar
        if (expected.busbar) {
            checkItem(expected.busbar, true, expected.ctQty);
        }

        // Check Labour
        if (expected.labour) {
            checkItem(expected.labour, true, expected.ctQty);
        }
    } else {
        // All should be gone
        checkItem('CT-COMPARTMENTS', false);
        checkItem('CT-PANEL', false);
        checkItem('CT-TEST-BLOCK', false);
        checkItem('CT-WIRING', false);
        checkItem('CT-S-TYPE', false);
        checkItem('CT-T-TYPE', false);

        // Check that no busbars or labour items exist
        const hasBusbar = items.some(i => i.name.startsWith('BB-') || i.name.startsWith('BBC-'));
        const hasLabour = items.some(i => i.name.startsWith('CT-') && i.name.endsWith('A'));

        if (hasBusbar) {
            console.error('[FAIL] Busbar items should be removed');
        } else {
            console.log('[PASS] No busbar items present');
        }

        if (hasLabour) {
            console.error('[FAIL] Labour items should be removed');
        } else {
            console.log('[PASS] No labour items present');
        }
    }
}

runTest().catch(console.error);
