
import { syncBoardItems, BoardConfig } from '../lib/board-item-service';
import prisma from '../lib/prisma';

// Mock config helper
const createConfig = (width: number | undefined, sections: number): BoardConfig => ({
    ctMetering: 'No',
    meterPanel: 'No',
    boardWidth: width,
    shippingSections: sections,
    type: 'Main Switchboard (MSB)',
    name: 'Test Board',
});

async function runTests() {
    console.log('--- Starting Site Reconnection Logic Tests ---');

    // Setup: Create a dummy board
    const quote = await prisma.quote.create({
        data: { quoteNumber: `TEST-REC-${Date.now()}`, status: 'DRAFT' }
    });
    const board = await prisma.board.create({
        data: { quoteId: quote.id, name: 'Test Reconnection Board' }
    });

    console.log(`Created Test Board: ${board.id}`);

    try {
        // Test 1: Width 3.5m (<=4), Sections 1 => No Item
        console.log('\nTest 1: Width 3.5m, Sections 1 (Expect 0)');
        await syncBoardItems(board.id, createConfig(3.5, 1));
        await checkItem(board.id, 0);

        // Test 2: Width 4.5m (>4), Sections 1 => No Item
        console.log('\nTest 2: Width 4.5m, Sections 1 (Expect 0)');
        await syncBoardItems(board.id, createConfig(4.5, 1));
        await checkItem(board.id, 0);

        // Test 3: Width 4.5m, Sections 2 => Reconnection = TRUNC((2+1)/2) = 1
        console.log('\nTest 3: Width 4.5m, Sections 2 (Expect 1)');
        await syncBoardItems(board.id, createConfig(4.5, 2));
        await checkItem(board.id, 1);

        // Test 4: Width 4.5m, Sections 3 => Reconnection = TRUNC((3+1)/2) = 2
        console.log('\nTest 4: Width 4.5m, Sections 3 (Expect 2)');
        await syncBoardItems(board.id, createConfig(4.5, 3));
        await checkItem(board.id, 2);

        // Test 5: Width 4.5m, Sections 5 => Reconnection = TRUNC((5+1)/2) = 3
        console.log('\nTest 5: Width 4.5m, Sections 5 (Expect 3)');
        await syncBoardItems(board.id, createConfig(4.5, 5));
        await checkItem(board.id, 3);

        // Test 6: Revert to Width 3.9m => Item Removed
        console.log('\nTest 6: Width 3.9m, Sections 5 (Expect 0 - Removed)');
        await syncBoardItems(board.id, createConfig(3.9, 5));
        await checkItem(board.id, 0);

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        // Cleanup
        await prisma.board.delete({ where: { id: board.id } });
        await prisma.quote.delete({ where: { id: quote.id } });
        await prisma.$disconnect();
    }
}

async function checkItem(boardId: string, expectedQty: number) {
    const items = await prisma.item.findMany({
        where: { boardId, name: 'MISC-SITE-RECONNECTION' }
    });

    if (expectedQty === 0) {
        if (items.length === 0) {
            console.log('✅ Success: Item not present.');
        } else {
            console.error(`❌ Failure: Expected 0 items, found ${items.length} with qty ${items[0].quantity}`);
        }
    } else {
        if (items.length === 1 && items[0].quantity === expectedQty) {
            console.log(`✅ Success: Found item with quantity ${expectedQty}.`);
        } else {
            console.error(`❌ Failure: Expected qty ${expectedQty}, found ${items.length > 0 ? items[0].quantity : 'None'}.`);
        }
    }
}

runTests();
