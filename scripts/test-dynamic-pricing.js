
const BASE_URL = 'http://localhost:3000/api';

async function runTest() {
    try {
        console.log('--- STARTING DYNAMIC PRICING TEST ---');

        // 1. Create Quote
        const quoteRes = await fetch(`${BASE_URL}/quotes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientName: 'Pricing Test Client',
                jobName: 'Dynamic Pricing Test',
                jobNumber: 'DPT-001'
            })
        });
        if (!quoteRes.ok) throw new Error(`Failed to create quote: ${quoteRes.statusText}`);
        const quoteData = await quoteRes.json();
        const quoteId = quoteData.id;
        console.log('Quote Created:', quoteId);

        // 2. Create Board with 1 Tier (Custom, Outdoor)
        // Scenario A: 1 Tier -> $1,800
        console.log('\n2. Creating Board with 1 Tier (Custom, Outdoor)...');
        const board1Res = await fetch(`${BASE_URL}/quotes/${quoteId}/boards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Dynamic Pricing Board',
                type: 'Main Switchboard',
                config: {
                    enclosureType: 'Custom',
                    location: 'Outdoor',
                    tierCount: 1,
                    material: '316 Stainless Steel Natural Finish' // Trigger uplift to check calc
                }
            })
        });
        if (!board1Res.ok) throw new Error(`Failed to create board: ${board1Res.statusText}`);
        const board1Data = await board1Res.json();
        const boardId = board1Data.id;

        // Verify 1 Tier Price
        let items = await getBoardItems(quoteId, boardId);
        checkPrice(items, '1B-TIERS-400', 1800, 1);

        // Check Uplift (Factor 0.75 for Natural Finish)
        // Base = 1800 + Delivery(150?) + Labels etc? 
        // We focus on Tiers price mainly.

        // 3. Update to 2 Tiers
        // Scenario B: 2 Tiers -> $1,400 each
        console.log('\n3. Updating to 2 Tiers...');
        const update2Res = await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${boardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Dynamic Pricing Board',
                type: 'Main Switchboard',
                config: {
                    enclosureType: 'Custom',
                    location: 'Outdoor',
                    tierCount: 2,
                    material: '316 Stainless Steel Natural Finish'
                }
            })
        });
        if (!update2Res.ok) throw new Error(`Failed to update board: ${update2Res.statusText}`);

        items = await getBoardItems(quoteId, boardId);
        checkPrice(items, '1B-TIERS-400', 1400, 2);

        // 4. Update back to 1 Tier
        // Revert to Scenario A
        console.log('\n4. Reverting to 1 Tier...');
        const update1Res = await fetch(`${BASE_URL}/quotes/${quoteId}/boards/${boardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Dynamic Pricing Board',
                type: 'Main Switchboard',
                config: {
                    enclosureType: 'Custom',
                    location: 'Outdoor',
                    tierCount: 1,
                    material: '316 Stainless Steel Natural Finish'
                }
            })
        });
        if (!update1Res.ok) throw new Error(`Failed to update board: ${update1Res.statusText}`);

        items = await getBoardItems(quoteId, boardId);
        checkPrice(items, '1B-TIERS-400', 1800, 1);


        console.log('\n--- TEST COMPLETED SUCCESSFULLY ---');

    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

async function getBoardItems(quoteId, boardId) {
    const res = await fetch(`${BASE_URL}/quotes/${quoteId}`);
    if (!res.ok) throw new Error(`Failed to fetch quote: ${res.statusText}`);
    const quote = await res.json();
    const board = quote.boards.find(b => b.id === boardId);
    return board.items;
}

function checkPrice(items, partNumber, expectedPrice, expectedQty) {
    const item = items.find(i => i.name === partNumber);
    if (!item) {
        console.error(`[FAIL] ${partNumber} NOT FOUND`);
        throw new Error(`Item ${partNumber} missing`);
    }

    // Allow slight float diff
    const priceMatch = Math.abs(item.unitPrice - expectedPrice) < 0.01;
    const qtyMatch = item.quantity === expectedQty;

    if (priceMatch && qtyMatch) {
        console.log(`[PASS] ${partNumber}: Qty=${item.quantity}, Price=$${item.unitPrice} (Expected $${expectedPrice})`);
    } else {
        console.error(`[FAIL] ${partNumber}: Got Qty=${item.quantity}, Price=$${item.unitPrice}. Expected Qty=${expectedQty}, Price=$${expectedPrice}`);
        throw new Error(`Verification failed for ${partNumber}`);
    }
}

runTest();
