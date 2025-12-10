
import { syncBoardItems } from '../lib/board-item-service';
import prisma from '../lib/prisma';

// Mock prisma.item.findMany and other calls to run this in isolation or use real DB?
// Better to run against real DB but with a test board ID to see side effects? 
// Or better yet, just mock the prisma calls to verify logic flow?
// Given the complexity of mocking in this environment without a test runner setup, 
// I will create a script that USES the real service but logs what it WOULD do.
// Wait, syncBoardItems writes to DB. I should use a dummy board ID or create a test board.

// Let's create a temporary test board and run sync on it.

async function runTest() {
    console.log('--- Starting 1B-DOORS Logic Verification ---');

    // 1. Create a Test Quote & Board
    const quote = await prisma.quote.create({
        data: {
            quoteNumber: 'TEST-DOORS-' + Date.now(),
            projectRef: 'Door Test',
            clientName: 'Tester',
            status: 'Draft'
        }
    });

    const board = await prisma.board.create({
        data: {
            quoteId: quote.id,
            name: 'Test Board',
            type: 'Main Switchboard (MSB)',
            order: 0,
            config: '{}'
        }
    });

    console.log(`Created Test Board: ${board.id}`);

    try {
        // Test Case 1: Custom + Outdoor + 2 Tiers
        console.log('\n--- Test Case 1: Custom + Outdoor + 2 Tiers ---');
        await syncBoardItems(board.id, {
            enclosureType: 'Custom',
            location: 'Outdoor',
            tierCount: 2,
            baseRequired: 'No',
            ctMetering: 'No',
            meterPanel: 'No',
            wholeCurrentMetering: 'No'
        });

        let items = await prisma.item.findMany({ where: { boardId: board.id } });
        let doorItem = items.find(i => i.name === '1B-DOORS');
        console.log(`1B-DOORS Quantity: ${doorItem ? doorItem.quantity : 'NOT FOUND'} (Expected: 2)`);


        // Test Case 2: Custom + Indoor + 2 Tiers (Should Remove)
        console.log('\n--- Test Case 2: Custom + Indoor + 2 Tiers ---');
        await syncBoardItems(board.id, {
            enclosureType: 'Custom',
            location: 'Indoor',
            tierCount: 2,
            baseRequired: 'No',
            ctMetering: 'No',
            meterPanel: 'No',
            wholeCurrentMetering: 'No'
        });

        items = await prisma.item.findMany({ where: { boardId: board.id } });
        doorItem = items.find(i => i.name === '1B-DOORS');
        console.log(`1B-DOORS Quantity: ${doorItem ? doorItem.quantity : 'NOT FOUND'} (Expected: NOT FOUND)`);


        // Test Case 3: Cubic + Outdoor + 2 Tiers (Should NOT Add)
        console.log('\n--- Test Case 3: Cubic + Outdoor + 2 Tiers ---');
        await syncBoardItems(board.id, {
            enclosureType: 'Cubic',
            location: 'Outdoor',
            tierCount: 2,
            baseRequired: 'No',
            ctMetering: 'No',
            meterPanel: 'No',
            wholeCurrentMetering: 'No'
        });

        items = await prisma.item.findMany({ where: { boardId: board.id } });
        doorItem = items.find(i => i.name === '1B-DOORS');
        console.log(`1B-DOORS Quantity: ${doorItem ? doorItem.quantity : 'NOT FOUND'} (Expected: NOT FOUND)`);


        // Test Case 4: Custom + Outdoor + 4 Tiers (Add Back with new Qty)
        console.log('\n--- Test Case 4: Custom + Outdoor + 4 Tiers ---');
        await syncBoardItems(board.id, {
            enclosureType: 'Custom',
            location: 'Outdoor',
            tierCount: 4,
            baseRequired: 'No',
            ctMetering: 'No',
            meterPanel: 'No',
            wholeCurrentMetering: 'No'
        }, { forceTiers: true });
        items = await prisma.item.findMany({ where: { boardId: board.id } });
        doorItem = items.find(i => i.name === '1B-DOORS');
        console.log(`1B-DOORS Quantity: ${doorItem ? doorItem.quantity : 'NOT FOUND'} (Expected: 4)`);

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        // Cleanup
        console.log('\nCleaning up...');
        await prisma.item.deleteMany({ where: { boardId: board.id } });
        await prisma.board.delete({ where: { id: board.id } });
        await prisma.quote.delete({ where: { id: quote.id } });
        console.log('Done.');
    }
}

runTest();
