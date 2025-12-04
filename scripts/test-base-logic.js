// Test script for Base Cost Logic (1B-BASE)
// Run with: node scripts/test-base-logic.js

const API_BASE = 'http://localhost:3000/api';

let testQuoteId = null;
let testBoardId = null;

async function makeRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
}

async function createTestQuote() {
    console.log('\n📝 Creating test quote...');
    const quote = await makeRequest('/quotes', {
        method: 'POST',
        body: JSON.stringify({
            clientName: 'Test Client',
            projectRef: 'Base Logic Test',
            description: 'Testing base cost logic'
        })
    });
    testQuoteId = quote.id;
    console.log(`✅ Created quote: ${testQuoteId}`);
    return testQuoteId;
}

async function createBoard(config) {
    console.log(`\n🔧 Creating board with config: ${JSON.stringify(config, null, 2)}`);
    const board = await makeRequest(`/quotes/${testQuoteId}/boards`, {
        method: 'POST',
        body: JSON.stringify({
            name: config.name,
            type: config.type,
            config: config
        })
    });
    testBoardId = board.id;
    console.log(`✅ Created board: ${testBoardId}`);
    return testBoardId;
}

async function updateBoardConfig(config) {
    console.log(`\n🔄 Updating board config: ${JSON.stringify(config, null, 2)}`);
    await makeRequest(`/quotes/${testQuoteId}/boards/${testBoardId}`, {
        method: 'PATCH',
        body: JSON.stringify({ config })
    });
    console.log('✅ Board config updated');
}

async function getBoardItems() {
    const items = await makeRequest(`/quotes/${testQuoteId}/boards/${testBoardId}/items`);
    return items;
}

async function checkBaseItem(expectedCost, shouldExist = true) {
    const items = await getBoardItems();
    const baseItem = items.find(i => i.name === '1B-BASE');

    if (!shouldExist) {
        if (!baseItem) {
            console.log('✅ 1B-BASE correctly NOT present');
            return true;
        } else {
            console.log(`❌ FAIL: 1B-BASE should not exist but found with cost ${baseItem.cost}`);
            return false;
        }
    }

    if (!baseItem) {
        console.log(`❌ FAIL: Expected 1B-BASE with cost ${expectedCost} but item not found`);
        return false;
    }

    if (baseItem.cost === expectedCost && baseItem.unitPrice === expectedCost) {
        console.log(`✅ 1B-BASE cost is correct: ${baseItem.cost} (unitPrice: ${baseItem.unitPrice})`);
        return true;
    } else {
        console.log(`❌ FAIL: Expected cost ${expectedCost}, got ${baseItem.cost} (unitPrice: ${baseItem.unitPrice})`);
        return false;
    }
}

async function cleanup() {
    if (testQuoteId) {
        console.log('\n🗑️  Cleaning up test data...');
        try {
            await makeRequest(`/quotes/${testQuoteId}`, { method: 'DELETE' });
            console.log('✅ Test quote deleted');
        } catch (err) {
            console.log('⚠️  Cleanup failed (quote may not exist)');
        }
    }
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('🧪 BASE COST LOGIC TEST SUITE');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;

    try {
        // Setup
        await createTestQuote();

        // Test 1: Custom board, Base Required = Yes, Tiers = 1 → cost = 400
        console.log('\n' + '─'.repeat(60));
        console.log('TEST 1: Custom board, baseRequired=Yes, tiers=1 → cost=400');
        console.log('─'.repeat(60));
        await createBoard({
            type: 'Main Switchboard (MSB)',
            name: 'Test MSB',
            enclosureType: 'Custom',
            tierCount: 1,
            baseRequired: 'Yes',
            location: 'Indoor',
            ipRating: 'IP42',
            form: '1',
            faultRating: '25kA',
            material: 'Mild Steel',
            currentRating: '63A',
            spd: 'Yes',
            ctMetering: 'No',
            meterPanel: 'No',
            wholeCurrentMetering: 'No',
            drawingRef: 'No',
            drawingRefNumber: '',
            notes: ''
        });
        if (await checkBaseItem(400)) passed++; else failed++;

        // Test 2: Update tiers to 2 → cost = 600
        console.log('\n' + '─'.repeat(60));
        console.log('TEST 2: Update tiers=2 → cost=600');
        console.log('─'.repeat(60));
        await updateBoardConfig({
            tierCount: 2,
            enclosureType: 'Custom',
            baseRequired: 'Yes'
        });
        if (await checkBaseItem(600)) passed++; else failed++;

        // Test 3: Update tiers to 3 → cost = 800
        console.log('\n' + '─'.repeat(60));
        console.log('TEST 3: Update tiers=3 → cost=800');
        console.log('─'.repeat(60));
        await updateBoardConfig({
            tierCount: 3,
            enclosureType: 'Custom',
            baseRequired: 'Yes'
        });
        if (await checkBaseItem(800)) passed++; else failed++;

        // Test 4: Set baseRequired = No → no 1B-BASE
        console.log('\n' + '─'.repeat(60));
        console.log('TEST 4: Set baseRequired=No → 1B-BASE removed');
        console.log('─'.repeat(60));
        await updateBoardConfig({
            tierCount: 3,
            enclosureType: 'Custom',
            baseRequired: 'No'
        });
        if (await checkBaseItem(0, false)) passed++; else failed++;

        // Test 5: Set baseRequired = Yes again → cost = 800
        console.log('\n' + '─'.repeat(60));
        console.log('TEST 5: Set baseRequired=Yes → 1B-BASE added with cost=800');
        console.log('─'.repeat(60));
        await updateBoardConfig({
            tierCount: 3,
            enclosureType: 'Custom',
            baseRequired: 'Yes'
        });
        if (await checkBaseItem(800)) passed++; else failed++;

        // Test 6: Change enclosure to Cubic → no 1B-BASE
        console.log('\n' + '─'.repeat(60));
        console.log('TEST 6: Change enclosureType=Cubic → 1B-BASE removed');
        console.log('─'.repeat(60));
        await updateBoardConfig({
            tierCount: 3,
            enclosureType: 'Cubic',
            baseRequired: 'Yes'
        });
        if (await checkBaseItem(0, false)) passed++; else failed++;

        // Test 7: Change back to Custom → cost = 800
        console.log('\n' + '─'.repeat(60));
        console.log('TEST 7: Change back to enclosureType=Custom → cost=800');
        console.log('─'.repeat(60));
        await updateBoardConfig({
            tierCount: 3,
            enclosureType: 'Custom',
            baseRequired: 'Yes'
        });
        if (await checkBaseItem(800)) passed++; else failed++;

        // Test 8: tierCount = 0 → no 1B-BASE
        console.log('\n' + '─'.repeat(60));
        console.log('TEST 8: Set tierCount=0 → 1B-BASE removed');
        console.log('─'.repeat(60));
        await updateBoardConfig({
            tierCount: 0,
            enclosureType: 'Custom',
            baseRequired: 'Yes'
        });
        if (await checkBaseItem(0, false)) passed++; else failed++;

    } catch (error) {
        console.error('\n❌ Test suite error:', error.message);
        failed++;
    } finally {
        await cleanup();
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Total:  ${passed + failed}`);
    console.log('='.repeat(60));

    if (failed === 0) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log(`\n⚠️  ${failed} test(s) failed`);
        process.exit(1);
    }
}

// Run tests
runTests().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
