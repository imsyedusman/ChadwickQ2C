import { PrismaClient } from '@prisma/client';
import { syncBoardItems } from '../lib/board-item-service';

const prisma = new PrismaClient();

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyMetering() {
    console.log('--- START METERING DETERMINISM VERIFICATION ---');

    // 1. Create a temporary quote and board
    const quote = await prisma.quote.create({
        data: {
            quoteNumber: 'METER-TEST-1',
            clientName: 'Test Client',
            status: 'DRAFT',
            globalDiscount: 0,
            globalContingency: 0
        }
    });

    const board = await prisma.board.create({
        data: {
            quoteId: quote.id,
            name: 'METER-BD',
            type: 'MSB',
            order: 1
        }
    });

    const printItems = async (label: string) => {
        const items = await prisma.item.findMany({ where: { boardId: board.id } });
        console.log(`\n>>> [${label}] Items on Board: ${items.length}`);
        items.forEach(i => {
            console.log(`  - ${i.name} (${i.quantity}) [Tag: ${i.systemTag || 'None'}]`);
        });
        return items;
    };

    try {
        // --- TEST 1: Both OFF, Meter Panel ON (Fallback) ---
        console.log('\n--- TEST 1: Meter Panel Fallback ---');
        let config: any = {
            currentRating: '400A', // Over 100A to prove CT is NOT forced anymore
            ctMetering: 'No',
            wholeCurrentMetering: 'No',
            meterPanel: 'Yes'
        };
        await prisma.board.update({ where: { id: board.id }, data: { config: JSON.stringify(config) } });
        await syncBoardItems(board.id, config, { forceTiers: true });

        let items = await printItems('Panel Fallback');
        if (!items.find(i => i.name === '100A-PANEL')) throw new Error('Fallback Panel missing');
        if (items.some(i => i.systemTag === 'CT')) throw new Error('CT items found (Forced mode failed constraint)');

        // --- TEST 2: Switch to CT = Yes ---
        console.log('\n--- TEST 2: Switch to CT = Yes ---');
        config.ctMetering = 'Yes';
        await prisma.board.update({ where: { id: board.id }, data: { config: JSON.stringify(config) } });
        await syncBoardItems(board.id, config, { forceTiers: true });

        items = await printItems('CT ON');
        if (!items.find(i => i.systemTag === 'CT')) throw new Error('No CT items generated');
        // Fallback panel should be completely gone / replaced by CT panel
        if (items.find(i => i.systemTag === 'METER_PANEL_FALLBACK')) throw new Error('Fallback Panel should be deleted');

        // Let's verify no 100A-PANEL exists since we are in CT mode, wait, if meterPanel="Yes" and CT="Yes", CT doesn't add 100A-PANEL.
        if (items.find(i => i.name === '100A-PANEL')) throw new Error('100A-PANEL should not exist during CT mode');

        // --- TEST 3: Switch from CT to Whole Current ---
        console.log('\n--- TEST 3: Switch CT -> Whole Current ---');
        config.ctMetering = 'No';
        config.wholeCurrentMetering = 'Yes';
        config.wholeCurrentMeters = [{ type: '100A wiring 3-phase', quantity: 1 }];
        await prisma.board.update({ where: { id: board.id }, data: { config: JSON.stringify(config) } });
        await syncBoardItems(board.id, config, { forceTiers: true });

        items = await printItems('WC ON (CT OFF)');
        if (items.find(i => i.systemTag === 'CT')) throw new Error('CT items remained during switch');
        if (!items.find(i => i.systemTag === 'WHOLE_CURRENT')) throw new Error('WC items not generated');
        if (!items.find(i => i.name === '100A-WC-WIRING' || i.name === '100A-WIRING-3PH')) {
            console.warn('Check WC 3PH WIRING existence.');
        }

        // --- TEST 4: Both OFF ---
        console.log('\n--- TEST 4: Both OFF ---');
        config.wholeCurrentMetering = 'No';
        await prisma.board.update({ where: { id: board.id }, data: { config: JSON.stringify(config) } });
        await syncBoardItems(board.id, config, { forceTiers: true });

        items = await printItems('Both OFF (Meter Panel ON)');
        if (items.find(i => i.systemTag === 'CT')) throw new Error('CT residue');
        if (items.find(i => i.systemTag === 'WHOLE_CURRENT')) throw new Error('WC residue');
        if (!items.find(i => i.name === '100A-PANEL' && i.systemTag === 'METER_PANEL_FALLBACK')) throw new Error('Fallback Panel did not return');

        console.log('\n✅ ALL METERING DETERMINISM TESTS PASSED!');

    } catch (e: any) {
        console.error('\n❌ TEST FAILED:', e.message);
    } finally {
        await prisma.item.deleteMany({ where: { boardId: board.id } });
        await prisma.board.delete({ where: { id: board.id } });
        await prisma.quote.delete({ where: { id: quote.id } });
    }
}

verifyMetering().catch(console.error).finally(() => prisma.$disconnect());
