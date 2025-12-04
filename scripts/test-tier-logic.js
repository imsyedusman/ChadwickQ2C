
const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    try {
        console.log('--- STARTING TIER LOGIC TEST ---');

        // 1. Create a new Quote
        console.log('\n1. Creating new Quote...');
        const quoteRes = await fetch(`${BASE_URL}/quotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientName: 'Test Client',
                jobName: 'Tier Logic Test',
                jobNumber: 'TL-001'
            })
        });
        if (!quoteRes.ok) throw new Error(`Failed to create quote: ${quoteRes.statusText}`);
        const quoteData = await quoteRes.json();
        const quoteId = quoteData.id;
        console.log('Quote Created:', quoteId);

        // 2. Create Board with 0 Tiers (Cubic)
        console.log('\n2. Creating Board with 0 Tiers (Cubic)...');
        const boardRes = await fetch(`${BASE_URL}/quotes/${quoteId}/boards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Board 1',
                type: 'Main Switchboard',
                config: {
                    enclosureType: 'Cubic',
                    tierCount: 0
                }
            })
        });
        if (!boardRes.ok) throw new Error(`Failed to create board 1: ${boardRes.statusText}`);
        const boardData = await boardRes.json();
        const boardId = boardData.id;
        console.log('Board Created:', boardId);

        // Verify Items (Should be NO tier items, NO misc items)
        let items = await getBoardItems(quoteId, boardId);
        checkItem(items, '1A-TIERS', 0);
        checkItem(items, 'MISC-LABELS', 0);
        checkItem(items, 'MISC-DELIVERY-UTE', 0);

        // 4. Create Board with 1 Tier (Cubic)
        console.log('\n4. Creating Board with 1 Tier (Cubic)...');
        const board1TierRes = await fetch(`${BASE_URL}/quotes/${quoteId}/boards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: '1 Tier Board',
                type: 'Main Switchboard',
                config: {
                    enclosureType: 'Cubic',
                    tierCount: 1
                }
            })
        });
        if (!board1TierRes.ok) throw new Error(`Failed to create board 2: ${board1TierRes.statusText}`);
        const board1TierData = await board1TierRes.json();
        items = await getBoardItems(quoteId, board1TierData.id);
        checkItem(items, '1A-TIERS', 1);
        checkItem(items, 'MISC-LABELS', 1);
        checkItem(items, 'MISC-HARDWARE', 1);
        checkItem(items, 'MISC-DELIVERY-UTE', 1);
        checkItem(items, 'MISC-DELIVERY-HIAB', 0);

        // 5. Create Board with 2 Tiers (Cubic)
        console.log('\n5. Creating Board with 2 Tiers (Cubic)...');
        const board2TiersRes = await fetch(`${BASE_URL}/quotes/${quoteId}/boards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: '2 Tier Board',
                type: 'Main Switchboard',
                config: {
                    enclosureType: 'Cubic',
                    tierCount: 2
                }
            })
        });
        if (!board2TiersRes.ok) throw new Error(`Failed to create board 3: ${board2TiersRes.statusText}`);
        const board2TiersData = await board2TiersRes.json();
        items = await getBoardItems(quoteId, board2TiersData.id);
        checkItem(items, '1A-TIERS', 2);
        checkItem(items, 'MISC-LABELS', 2);
        checkItem(items, 'MISC-HARDWARE', 2);
        checkItem(items, 'MISC-DELIVERY-UTE', 0);
        checkItem(items, 'MISC-DELIVERY-HIAB', 1);

        // 6. Create Board with 1 Tier (Custom)
        console.log('\n6. Creating Board with 1 Tier (Custom)...');
        const boardCustomRes = await fetch(`${BASE_URL}/quotes/${quoteId}/boards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Custom Board',
                type: 'Main Switchboard',
                config: {
                    enclosureType: 'Custom',
                    tierCount: 1
                }
            })
        });
        if (!boardCustomRes.ok) throw new Error(`Failed to create board 4: ${boardCustomRes.statusText}`);
        const boardCustomData = await boardCustomRes.json();
        items = await getBoardItems(quoteId, boardCustomData.id);
        checkItem(items, '1B-TIERS-400', 1); // Should be 1B for Custom
        checkItem(items, '1A-TIERS', 0);
        checkItem(items, 'MISC-DELIVERY-UTE', 1);


        // 7. Test Update: Update Board 1 (0 Tiers) to 3 Tiers
        console.log('\n7. Updating Board 1 to 3 Tiers (Cubic)...');
        const updateRes = await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${boardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Board 1 Updated',
                type: 'Main Switchboard',
                config: {
                    enclosureType: 'Cubic',
                    tierCount: 3
                }
            })
        });
        if (!updateRes.ok) throw new Error(`Failed to update board 1: ${updateRes.statusText}`);
        const updateData = await updateRes.json();
        console.log('Update Response Debug Config:', JSON.stringify(updateData.debugConfig, null, 2));

        // Verify items after update
        items = await getBoardItems(quoteId, boardId);
        checkItem(items, '1A-TIERS', 3);
        checkItem(items, 'MISC-LABELS', 3);
        checkItem(items, 'MISC-HARDWARE', 3);
        checkItem(items, 'MISC-DELIVERY-UTE', 0);
        checkItem(items, 'MISC-DELIVERY-HIAB', 1);

        console.log('\n--- TEST COMPLETED SUCCESSFULLY ---');

    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

async function getBoardItems(quoteId, boardId) {
    // Fetch the whole quote to get board items
    const res = await fetch(`${BASE_URL}/quotes/${quoteId}`);
    if (!res.ok) throw new Error(`Failed to fetch quote: ${res.statusText}`);
    const quote = await res.json();
    const board = quote.boards.find(b => b.id === boardId);
    if (!board) throw new Error(`Board ${boardId} not found in quote`);
    return board.items;
}

function checkItem(items, partNumber, expectedQty) {
    const item = items.find(i => i.name === partNumber);
    const qty = item ? item.quantity : 0;
    if (qty === expectedQty) {
        console.log(`[PASS] ${partNumber}: Expected ${expectedQty}, Got ${qty}`);
    } else {
        console.error(`[FAIL] ${partNumber}: Expected ${expectedQty}, Got ${qty}`);
        throw new Error(`Verification failed for ${partNumber}`);
    }
}

runTest();
