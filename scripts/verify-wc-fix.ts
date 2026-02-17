
import prisma from '../lib/prisma';
import { syncBoardItems, BoardConfig } from '../lib/board-item-service';

async function main() {
    console.log('Starting Whole Current Verification...');

    // 1. Create a Test Board & Quote
    const quote = await prisma.quote.create({
        data: {
            quoteNumber: `TEST-WC-${Date.now()}`,
            settingsSnapshot: '{}'
        }
    });

    const board = await prisma.board.create({
        data: {
            quoteId: quote.id,
            name: 'WC-TEST-BOARD',
            isOptional: false,
            config: '{}'
        }
    });

    console.log(`Created Test Board: ${board.id}`);

    try {
        // 2. Simulate WC = YES
        console.log('\n--- Test Phase 1: Enable Whole Current ---');
        const configYes: BoardConfig = {
            ctMetering: 'No',
            meterPanel: 'No',
            wholeCurrentMetering: 'Yes', // THE TOGGLE
            wholeCurrentMeters: [{ type: '100A wiring 1-phase', quantity: 1 }],
            location: 'Indoor',
            enclosureType: 'Custom',
            tierCount: 0
        };

        // Update board config
        await prisma.board.update({
            where: { id: board.id },
            data: { config: JSON.stringify(configYes) }
        });

        // Run Sync
        await syncBoardItems(board.id, configYes);

        // Verify Items Present
        let items = await prisma.item.findMany({ where: { boardId: board.id } });
        const wcItems = items.filter(i => i.systemTag === 'WHOLE_CURRENT');
        console.log(`WC Items Found (Should be > 0): ${wcItems.length}`);

        if (wcItems.length === 0) throw new Error('Failed to add WC items');
        const hasPanel = wcItems.some(i => i.name === '100A-PANEL');
        console.log(`Has 100A-PANEL: ${hasPanel}`);


        // 3. Simulate WC = NO
        // Crucial Test: We send 'No' but we also send the OLD array to ensure backend ignores it
        console.log('\n--- Test Phase 2: Disable Whole Current (Backend Enforcement) ---');
        const configNo: BoardConfig = {
            ...configYes,
            wholeCurrentMetering: 'No',
            // Purposely leaving the array to test backend "Defense in Depth"
            wholeCurrentMeters: [{ type: '100A wiring 1-phase', quantity: 100 }] // High qty to be obvious
        };

        await prisma.board.update({
            where: { id: board.id },
            data: { config: JSON.stringify(configNo) }
        });

        await syncBoardItems(board.id, configNo);

        items = await prisma.item.findMany({ where: { boardId: board.id } });
        const wcItemsRemaining = items.filter(i => i.systemTag === 'WHOLE_CURRENT');
        console.log(`WC Items Remaining (Should be 0): ${wcItemsRemaining.length}`);

        if (wcItemsRemaining.length > 0) {
            console.error('FAILED: Items were not removed!');
            wcItemsRemaining.forEach(i => console.log(` - ${i.name} (${i.quantity})`));
            throw new Error('Cleanup Logic Failed');
        } else {
            console.log('SUCCESS: All Whole Current items removed.');
        }

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        // Cleanup
        console.log('\nCleaning up test data...');
        await prisma.quote.delete({ where: { id: quote.id } });
    }
}

main();
