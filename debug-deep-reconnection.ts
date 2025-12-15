
import { PrismaClient } from '@prisma/client';
import { syncBoardItems } from './lib/board-item-service';

const prisma = new PrismaClient();

async function deepDebug() {
    try {
        console.log('--- Deep Debugging Site Reconnection ---');

        // 1. Setup Test Board
        const quote = await prisma.quote.create({ data: { quoteNumber: `DBG-DEEP-${Date.now()}`, status: 'DRAFT' } });
        const board = await prisma.board.create({ data: { quoteId: quote.id, name: 'Deep Debug Board' } });
        console.log(`Created Board: ${board.id}`);

        // 2. Add a known Basics item manually (e.g. MISC-LABELS is usually auto-added if tiers>0, let's force tiers)
        // Actually, syncBoardItems adds MISC-LABELS if tierCount > 0.

        // 3. Run Sync with Tiers=1 (to get Labels) AND Width=6, Sections=4 (to get Reconnection)
        console.log('\n2. Running Sync with TierCount=1, Width=6, Sections=4');
        const config = {
            type: 'Main Switchboard (MSB)',
            name: 'Debug',
            ctMetering: 'No',
            meterPanel: 'No',
            boardWidth: 6,
            shippingSections: 4,
            tierCount: 1,
            width: 6 // Just in case I typoed the property name in my head (it is boardWidth in interface, but let's be safe)
        };
        await syncBoardItems(board.id, config, { forceTiers: true });

        // 4. Check Board Items
        const items = await prisma.item.findMany({ where: { boardId: board.id } });

        console.log('\n3. All Board Items:');
        items.forEach(i => {
            console.log(`ITEM: [${i.name}]`);
            console.log(` - Category: [${i.category}]`);
            console.log(` - Subcat:   [${i.subcategory}]`);
            console.log(` - Qty:      ${i.quantity}`);
            console.log(` - Price:    ${i.unitPrice}`);
        });

        const reconnection = items.find(i => i.name === 'MISC-SITE-RECONNECTION');
        const labels = items.find(i => i.name === 'MISC-LABELS');

        if (reconnection) {
            console.log('\n✅ Reconnection Item Found.');
            console.log(`Category Match? '${reconnection.category}' vs 'Basics'`);
        } else {
            console.log('\n❌ Reconnection Item MISSING.');
        }

        if (labels) {
            console.log(`Reference Item (Labels) Category: '${labels.category}'`);
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
