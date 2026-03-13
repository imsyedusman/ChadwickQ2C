
const BASE_URL = 'http://localhost:3000/api';

async function safeFetch(url, options) {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
        data = await res.json();
    } else {
        data = await res.text();
    }

    if (!res.ok) {
        throw new Error(`Fetch failed for ${url}: ${res.status} ${res.statusText}\n${JSON.stringify(data, null, 2)}`);
    }
    return data;
}

async function verifyItems(quoteId, boardId, expectedChassis, totalFuseQty) {
    const quote = await safeFetch(`${BASE_URL}/quotes/${quoteId}`, {});
    const board = quote.boards.find(b => b.id === boardId);
    if (!board) throw new Error(`Board ${boardId} not found in quote ${quoteId}`);
    const items = board.items;

    console.log(`\nVerifying Board ${board.name} (Total Fuses: ${totalFuseQty})`);

    const chassisItems = items.filter(i => i.name.startsWith('100A-CHASSIS'));
    
    if (expectedChassis) {
        const item = items.find(i => i.name === expectedChassis);
        if (item) {
            console.log(`[PASS] Found expected chassis: ${expectedChassis}`);
        } else {
            console.error(`[FAIL] Missing expected chassis: ${expectedChassis}. Found: ${chassisItems.map(i => i.name).join(', ') || 'none'}`);
        }
    } else {
        if (chassisItems.length === 0) {
            console.log(`[PASS] No chassis found (as expected)`);
        } else {
            console.error(`[FAIL] Chassis found but none expected: ${chassisItems.map(i => i.name).join(', ')}`);
        }
    }

    const fuseItem = items.find(i => i.name === '100A-FUSE');
    if (fuseItem) {
        const qty = Number(fuseItem.quantity);
        if (qty === totalFuseQty) {
            console.log(`[PASS] 100A-FUSE quantity is correct: ${totalFuseQty}`);
        } else {
            console.error(`[FAIL] 100A-FUSE quantity mismatch: ${qty} (Expected: ${totalFuseQty})`);
        }
    } else {
        console.error(`[FAIL] 100A-FUSE not found in items: ${items.map(i => i.name).join(', ')}`);
    }
}

async function runTest() {
    console.log('Starting Whole-Current Chassis Threshold Logic Test...');

    const quotes = await safeFetch(`${BASE_URL}/quotes`, {});
    if (!Array.isArray(quotes) || quotes.length === 0) {
        console.error('No quotes found. Please create a quote first.');
        return;
    }
    const quoteId = quotes[0].id;

    const baseConfig = {
        location: 'Indoor', ipRating: 'IP42', form: '1', faultRating: '25kA', enclosureType: 'Mild Steel', currentRating: '100A',
        ctMetering: 'No', meterPanel: 'No', spd: 'No', drawingRef: 'No', notes: ''
    };

    // --- Case A: 6 Fuses (Threshold Not Crossed) ---
    console.log('\n--- Case A: 100A 3-ph Qty 2 (6 Fuses) ---');
    const board1 = await safeFetch(`${BASE_URL}/quotes/${quoteId}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Threshold Test Board',
            type: 'Main Switchboard (MSB)',
            config: {
                ...baseConfig,
                wholeCurrentMetering: 'Yes',
                wcType: '100A wiring 3-phase',
                wcQuantity: 2
            }
        })
    });
    await verifyItems(quoteId, board1.id, null, 6);

    // --- Case B: 9 Fuses (Threshold Crossed) ---
    console.log('\n--- Case B: Update Board to 100A 3-ph Qty 3 (9 Fuses) ---');
    await safeFetch(`${BASE_URL}/quotes/${quoteId}/boards/${board1.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            config: {
                ...baseConfig,
                wholeCurrentMetering: 'Yes',
                wcType: '100A wiring 3-phase',
                wcQuantity: 3
            }
        })
    });
    await verifyItems(quoteId, board1.id, '100A-CHASSIS-18', 9);

    // --- Case C: 21 Fuses (Existing Logic Upgrade) ---
    console.log('\n--- Case C: Update Board to 100A 3-ph Qty 7 (21 Fuses) ---');
    await safeFetch(`${BASE_URL}/quotes/${quoteId}/boards/${board1.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            config: {
                ...baseConfig,
                wholeCurrentMetering: 'Yes',
                wcType: '100A wiring 3-phase',
                wcQuantity: 7
            }
        })
    });
    await verifyItems(quoteId, board1.id, '100A-CHASSIS-24', 21);

    // --- Case D: Drop below threshold again ---
    console.log('\n--- Case D: Update Board back to Qty 2 (6 Fuses) ---');
    await safeFetch(`${BASE_URL}/quotes/${quoteId}/boards/${board1.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            config: {
                ...baseConfig,
                wholeCurrentMetering: 'Yes',
                wcType: '100A wiring 3-phase',
                wcQuantity: 2
            }
        })
    });
    await verifyItems(quoteId, board1.id, null, 6);

    console.log('\nCleanup: Deleting test board...');
    await safeFetch(`${BASE_URL}/quotes/${quoteId}/boards/${board1.id}`, { method: 'DELETE' });
    console.log('Done.');
}

runTest().catch(console.error);
