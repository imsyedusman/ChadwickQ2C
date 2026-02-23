import { PrismaClient } from '@prisma/client';
import { syncBoardItems, BoardConfig } from '../lib/board-item-service';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Testing Bakelite Gland Plate qty logic ---');

    console.log('1) Setting up test quote & board...');
    const quote = await prisma.quote.findFirst();
    if (!quote) {
        console.error("No quotes found to attach test board to. Please create a quote first.");
        return;
    }

    let testBoardId = '';

    try {
        const testBoard = await prisma.board.create({
            data: {
                name: 'DB-TEST-BAKELITE',
                quoteId: quote.id,
                config: '{}'
            }
        });

        testBoardId = testBoard.id;
        console.log(`Created test board: ${testBoard.id}`);

        const config: BoardConfig = {
            type: 'Distribution Board (DB)',
            name: 'DB-TEST-BAKELITE',
            location: 'Indoor',
            enclosureType: 'Custom',
            material: 'Powder Coated Mild Steel',
            ctMetering: 'No',
            meterPanel: 'No',
            wholeCurrentMetering: 'Yes',
            wholeCurrentMeters: [
                { type: '100A wiring 1-phase', quantity: 1 },
                { type: '100A wiring 3-phase', quantity: 1 }
            ]
            // bakeliteQty is undefined
        };

        console.log('\n2) Running sync with default bakeliteQty (undefined)');
        // We pass forceTiers: true as though it's the wizard save
        await syncBoardItems(testBoard.id, config, { forceTiers: true });

        let items = await prisma.item.findMany({ where: { boardId: testBoard.id } });

        let panel = items.find(i => i.name === '100A-PANEL');
        let nl = items.find(i => i.name === '100A-NEUTRAL-LINK');
        let mcb3 = items.find(i => i.name === '100A-MCB-3PH');
        let mcb1 = items.find(i => i.name === '100A-MCB-1PH');

        console.log(`Result:`);
        console.log(` 100A-PANEL qty expected: 2, actual: ${panel?.quantity}`);
        console.log(` 100A-NEUTRAL-LINK qty expected: 2, actual: ${nl?.quantity}`);
        console.log(` 100A-MCB-1PH qty expected: 1, actual: ${mcb1?.quantity}`);
        console.log(` 100A-MCB-3PH qty expected: 1, actual: ${mcb3?.quantity}`);

        if (Number(panel?.quantity) !== 2 || Number(nl?.quantity) !== 2) {
            throw new Error("Default tracking totalMeters failed");
        }

        console.log('\n3) Running sync with override bakeliteQty = 3');
        config.bakeliteQty = 3;
        await syncBoardItems(testBoard.id, config, { forceTiers: true });

        items = await prisma.item.findMany({ where: { boardId: testBoard.id } });

        // Ensure 100A-PANEL gets updated to 3
        panel = items.find(i => i.name === '100A-PANEL');
        nl = items.find(i => i.name === '100A-NEUTRAL-LINK');
        mcb3 = items.find(i => i.name === '100A-MCB-3PH');
        mcb1 = items.find(i => i.name === '100A-MCB-1PH');

        console.log(`Result:`);
        console.log(` 100A-PANEL qty expected: 3, actual: ${panel?.quantity}`);
        console.log(` 100A-NEUTRAL-LINK qty expected: 3, actual: ${nl?.quantity}`);
        console.log(` 100A-MCB-1PH qty expected: 1, actual: ${mcb1?.quantity}`);
        console.log(` 100A-MCB-3PH qty expected: 1, actual: ${mcb3?.quantity}`);

        if (Number(panel?.quantity) !== 3 || Number(nl?.quantity) !== 3 || Number(mcb1?.quantity) !== 1 || Number(mcb3?.quantity) !== 1) {
            throw new Error("Override bakeliteQty failed");
        }

        console.log('\n4) Renaming catalogue item (100A-PANEL to Bakelite Gland Plate)');
        const catalogItem = await prisma.catalogItem.findFirst({ where: { partNumber: '100A-PANEL' } });
        if (catalogItem && catalogItem.description !== 'Bakelite Gland Plate') {
            await prisma.catalogItem.update({
                where: { id: catalogItem.id },
                data: { description: 'Bakelite Gland Plate' }
            });
            console.log('Renamed in catalog successfully.');
        } else {
            console.log('Already renamed or missing in catalog.');
        }

        console.log('\n✅ All tests passed.');

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
