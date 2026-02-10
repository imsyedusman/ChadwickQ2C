import { syncBoardItems, BoardConfig } from '../lib/board-item-service';
import prisma from '../lib/prisma';

// Mocking prisma.board.findUnique and prisma.catalogItem.findMany would be ideal but complex.
// Instead, I'll rely on the logic modification I made.
// Wait, I can't easily run this without a real DB connection because syncBoardItems queries DB.
// I will try to create a unit-test style script if possible, or I'll just check the code logic carefully.
// Actually, I can use the existing 'scripts/test-ct-logic.js' as a template if it exists, or write a script that connects to the dev DB.

async function testSpareCt(quoteId: string) {
    console.log('--- STARTING SPARE CT VERIFICATION ---');

    // 1. Create a Dummy Board
    const board = await prisma.board.create({
        data: {
            name: 'TEST-SPARE-CT',
            quoteId: quoteId,
        }
    });

    console.log(`Created Test Board: ${board.id}`);

    try {
        // SCENARIO 1: SPARE ONLY (Qty 2)
        console.log('\n--- SCENARIO 1: SPARE ONLY (Qty 2) ---');
        const config1: BoardConfig = {
            ctMetering: 'No',
            ctSpareProvision: 'Yes',
            ctSpareQuantity: 2,
            ctType: 'S',
            meterPanel: 'No',
            currentRating: '800A',
            enclosureType: 'Custom',
            location: 'Indoor',
            form: '4b'
        };
        await syncBoardItems(board.id, config1);
        let items = await prisma.item.findMany({ where: { boardId: board.id } });
        checkItem(items, 'CT-WIRING', 2);
        checkItem(items, 'CT-PANEL', 2);
        checkItem(items, 'CT-S-TYPE', 0); // Should be 0

        // SCENARIO 2: ACTIVE ONLY (Qty 1)
        console.log('\n--- SCENARIO 2: ACTIVE ONLY (Qty 1) ---');
        const config2: BoardConfig = {
            ctMetering: 'Yes',
            ctQuantity: 1,
            ctSpareProvision: 'No',
            ctType: 'S',
            meterPanel: 'No',
            currentRating: '800A',
            enclosureType: 'Custom',
            location: 'Indoor'
        };
        await syncBoardItems(board.id, config2);
        items = await prisma.item.findMany({ where: { boardId: board.id } });
        checkItem(items, 'CT-WIRING', 1);
        checkItem(items, 'CT-S-TYPE', 1);

        // SCENARIO 3: COEXISTENCE (Active 1 + Spare 1 = 2 Base, 1 Coil)
        console.log('\n--- SCENARIO 3: COEXISTENCE (Active 1 + Spare 1) ---');
        const config3: BoardConfig = {
            ctMetering: 'Yes',
            ctQuantity: 1,
            ctSpareProvision: 'Yes',
            ctSpareQuantity: 1,
            ctType: 'T', // Change type to verify
            meterPanel: 'No',
            currentRating: '800A',
            enclosureType: 'Custom',
            location: 'Indoor'
        };
        await syncBoardItems(board.id, config3);
        items = await prisma.item.findMany({ where: { boardId: board.id } });
        checkItem(items, 'CT-WIRING', 2);
        checkItem(items, 'CT-PANEL', 2);
        checkItem(items, 'CT-T-TYPE', 1);
        checkItem(items, 'CT-S-TYPE', 0); // Previous should be gone

        console.log('\n--- VERIFICATION PASSED ---');

    } catch (e) {
        console.error('Verification Failed:', e);
    } finally {
        // Cleanup
        await prisma.item.deleteMany({ where: { boardId: board.id } });
        await prisma.board.delete({ where: { id: board.id } });
        console.log('Cleanup Done.');
    }
}

function checkItem(items: any[], partNumber: string, expectedQty: number) {
    const item = items.find(i => i.name === partNumber);
    const qty = item ? item.quantity : 0;
    if (qty === expectedQty) {
        console.log(`[PASS] ${partNumber}: Expected ${expectedQty}, Found ${qty}`);
    } else {
        console.error(`[FAIL] ${partNumber}: Expected ${expectedQty}, Found ${qty}`);
        throw new Error(`Verification failed for ${partNumber}`);
    }
}

// Ensure we have a valid quote ID to attach to
async function run() {
    const quote = await prisma.quote.findFirst();
    if (!quote) {
        console.error('No quotes found to attach test board to.');
        return;
    }
    // Patch the quote ID in testSpareCt (dirty hack for script)
    // Actually I'll just pass it or lookup inside.
    await testSpareCt(quote.id);
}

run();
