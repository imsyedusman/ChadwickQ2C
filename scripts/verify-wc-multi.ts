import { PrismaClient } from '@prisma/client';
import { syncBoardItems, BoardConfig } from '@/lib/board-item-service';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting WC Multi verification...");

    const quote = await prisma.quote.findFirst();
    if (!quote) {
        console.error("No quotes found to attach test board to. Please create a quote first.");
        return;
    }

    let testBoardId = '';

    try {
        const testBoard = await prisma.board.create({
            data: {
                name: 'TEST-WC-MULTI',
                quoteId: quote.id,
                config: '{}'
            }
        });
        testBoardId = testBoard.id;
        console.log(`Created test board: ${testBoard.id}`);

        // 2. Define Multi-Meter Config
        const config: BoardConfig = {
            type: 'Distribution Board (DB)',
            name: 'TEST-WC-MULTI',
            location: 'Indoor',
            enclosureType: 'Custom',
            material: 'Powder Coated Mild Steel',
            wholeCurrentMetering: 'Yes',
            // MULTI SELECTION
            wholeCurrentMeters: [
                { type: '100A wiring 1-phase', quantity: 2 },
                { type: '100A wiring 3-phase', quantity: 1 }
            ],
            // Legacy fields (should be ignored/overridden by list priority)
            wcType: '100A wiring 1-phase',
            wcQuantity: 1,

            ctMetering: 'No',
            currentRating: '100A', // Ensure !isCtMode
            meterPanel: 'No',

            // Required basics
            form: '2b',
            tierCount: 0
        };

        // 3. Sync
        console.log("Syncing board items...");
        await syncBoardItems(testBoard.id, config, { forceTiers: true });

        // 4. Verify Items
        const items = await prisma.item.findMany({ where: { boardId: testBoard.id } });
        console.log("Items created:", items.map(i => `${i.name}: ${i.quantity}`).join(', '));

        // Expectations:
        // 100A-PANEL: 2 + 1 = 3
        // 100A-FUSE: (2*1) + (1*3) = 5
        // 100A-NEUTRAL-LINK: 2 + 1 = 3
        // 100A-MCB-1PH: 2
        // 100A-MCB-3PH: 1

        const check = (name: string, expected: number) => {
            const item = items.find(i => i.name === name);
            const actual = item?.quantity ? item.quantity.toNumber() : 0;
            if (actual === expected) {
                console.log(`PASS: ${name} = ${actual}`);
            } else {
                console.error(`FAIL: ${name} expected ${expected}, got ${actual}`);
            }
        };

        check('100A-PANEL', 3);
        check('100A-FUSE', 5);
        check('100A-NEUTRAL-LINK', 3);
        check('100A-MCB-1PH', 2);
        check('100A-MCB-3PH', 1);

    } catch (e) {
        console.error(e);
    } finally {
        // Cleanup
        if (testBoardId) {
            console.log("Cleaning up test board...");
            await prisma.board.delete({ where: { id: testBoardId } });
        }
        await prisma.$disconnect();
    }
}

main();
