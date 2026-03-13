
import { syncBoardItems, BoardConfig } from './lib/board-item-service';
import prisma from './lib/prisma';

async function reproduce() {
    const quote = await prisma.quote.create({
        data: {
            quoteNumber: 'TEST-FUSE-ERR',
            clientName: 'Test Client',
            status: 'DRAFT',
        }
    });

    const board = await prisma.board.create({
        data: {
            quoteId: quote.id,
            name: 'Test Board',
            type: 'Distribution Board (DB)',
            config: JSON.stringify({})
        }
    });

    console.log(`Created test board ${board.id}`);

    const config: BoardConfig = {
        ctMetering: 'No',
        meterPanel: 'No',
        wholeCurrentMetering: 'Yes',
        wholeCurrentMeters: [
            { type: '100A wiring 3-phase', quantity: 2 },
            { type: '100A wiring 3-phase', quantity: 2 }
        ],
        tierCount: 1,
        enclosureType: 'Custom',
        currentRating: '100A',
    } as any;

    console.log('--- FIRST SYNC ---');
    await syncBoardItems(board.id, config);
    
    let items = await prisma.item.findMany({ where: { boardId: board.id } });
    let fuses = items.find(i => i.name === '100A-FUSE');
    console.log(`After Sync 1: 100A-FUSE qty = ${fuses?.quantity}`);

    console.log('--- SECOND SYNC (Same config) ---');
    await syncBoardItems(board.id, config);
    
    items = await prisma.item.findMany({ where: { boardId: board.id } });
    fuses = items.find(i => i.name === '100A-FUSE');
    console.log(`After Sync 2: 100A-FUSE qty = ${fuses?.quantity}`);

    // Cleanup
    await prisma.quote.delete({ where: { id: quote.id } });
    console.log('Cleanup done.');
}

reproduce()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
