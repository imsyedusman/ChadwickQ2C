
import { PrismaClient } from '@prisma/client';
import { syncBoardItems } from './lib/board-item-service';

const prisma = new PrismaClient();

async function deepDebug() {
    try {
        const quote = await prisma.quote.create({ data: { quoteNumber: `DBG-DEEP-${Date.now()}`, status: 'DRAFT' } });
        const board = await prisma.board.create({ data: { quoteId: quote.id, name: 'Deep Debug Board' } });

        // Config: Width 6, Sections 4 => Should trigger Reconnection
        // Config: Tiers 1 => Should trigger Labels
        const config = {
            type: 'Main Switchboard (MSB)',
            name: 'Debug',
            ctMetering: 'No',
            meterPanel: 'No',
            boardWidth: 6,
            shippingSections: 4,
            tierCount: 1,
        };
        await syncBoardItems(board.id, config, { forceTiers: true });

        const items = await prisma.item.findMany({ where: { boardId: board.id } });

        const reconnection = items.find(i => i.name === 'MISC-SITE-RECONNECTION');
        const labels = items.find(i => i.name === 'MISC-LABELS');

        if (reconnection) {
            console.log(`RECONNECTION: Found. Category='${reconnection.category}', Qty=${reconnection.quantity}`);
        } else {
            console.log(`RECONNECTION: NOT FOUND.`);
        }

        if (labels) {
            console.log(`LABELS: Found. Category='${labels.category}'`);
        }

        // Cleanup
        await prisma.board.delete({ where: { id: board.id } });
        await prisma.quote.delete({ where: { id: quote.id } });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

deepDebug();
