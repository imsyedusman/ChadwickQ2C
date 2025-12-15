
import { PrismaClient } from '@prisma/client';
import { syncBoardItems } from './lib/board-item-service';

const prisma = new PrismaClient();

async function debugReconnection() {
    try {
        console.log('--- Debugging Site Reconnection ---');

        // 1. Check Catalog
        const catalogItem = await prisma.catalogItem.findFirst({
            where: { partNumber: 'MISC-SITE-RECONNECTION' }
        });
        console.log('1. Catalog Item:', catalogItem ? 'FOUND' : 'NOT FOUND');
        if (catalogItem) console.log(JSON.stringify(catalogItem, null, 2));

        // 2. Setup Test Board
        const quote = await prisma.quote.create({ data: { quoteNumber: `DBG-${Date.now()}`, status: 'DRAFT' } });
        const board = await prisma.board.create({ data: { quoteId: quote.id, name: 'Debug Board' } });

        // 3. Run Sync
        console.log('\n2. Running Sync with Width=16, Sections=4');
        const config = {
            type: 'Main Switchboard (MSB)',
            name: 'Debug',
            ctMetering: 'No',
            meterPanel: 'No',
            boardWidth: 16,
            shippingSections: 4
        };
        await syncBoardItems(board.id, config);

        // 4. Check Board Items
        const items = await prisma.item.findMany({ where: { boardId: board.id } });
        const reconnectionItem = items.find(i => i.name === 'MISC-SITE-RECONNECTION');

        console.log('\n3. Board Items Result:', items.length, 'total items');
        if (reconnectionItem) {
            console.log('✅ MISC-SITE-RECONNECTION Found in DB!');
            console.log('   Qty:', reconnectionItem.quantity);
            console.log('   Category:', reconnectionItem.category);
            console.log('   Subcategory:', reconnectionItem.subcategory);
            console.log('   Price:', reconnectionItem.unitPrice);
            console.log('   Labour:', reconnectionItem.labourHours);
        } else {
            console.log('❌ MISC-SITE-RECONNECTION NOT Found in DB');
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

debugReconnection();
