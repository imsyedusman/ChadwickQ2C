import { PrismaClient } from '@prisma/client';
import { syncBoardItems } from '../lib/board-item-service';

const prisma = new PrismaClient();

async function runTest() {
    console.log('--- STAINLESS TIMING FIX TEST ---');

    const existingQuote = await prisma.quote.findFirst();
    if (!existingQuote) throw new Error('No quote found in DB for testing.');

    const testBoard = await prisma.board.create({
        data: {
            quoteId: existingQuote.id,
            name: 'SS Test Board',
            type: 'MainBoard'
        }
    });

    console.log(`Using quote ${existingQuote.id} and created board ${testBoard.id}`);

    // Configuration for the test
    const testConfig = {
        tierCount: 1,
        totalCompartments: 4,
        baseRequired: 'Yes',
        extraForDoorsOver: true,
        enclosureDepth: '400',
        enclosureType: 'Custom',
        material: 'Powder 316 Stainless Steel',
        // Minimal required fields to prevent errors
        ctMetering: 'No',
        meterPanel: 'No',
        wholeCurrentMetering: 'No',
        surgeProtection: 'No'
    };

    try {
        // --- PASS 1: Fresh Board ---
        console.log('\n>>> RUNNING FIRST SYNC (Fresh Board) <<<');
        await syncBoardItems(testBoard.id, testConfig, { forceTiers: true });

        // Retrieve items after pass 1
        const pass1Items = await prisma.item.findMany({ where: { boardId: testBoard.id } });

        let stainlessCost1 = 0;
        let baseCost1 = 0;

        console.log('\n--- Pass 1 Final State ---');
        pass1Items.forEach(item => {
            const name = item.name;
            if (['1B-TIERS-400', '1B-COMPARTMENTS', '1B-BASE', '1B-DOORS', '1B-600MM', '1B-800MM'].includes(name)) {
                const ext = Number(item.quantity) * item.unitPrice;
                console.log(`- Base Item: ${name} | Qty: ${item.quantity} | Unit: $${item.unitPrice} | Ext: $${ext}`);
                baseCost1 += ext;
            }
            if (name === '1B-SS-2B') {
                const ext = Number(item.quantity) * item.unitPrice;
                console.log(`- SS Uplift: ${name} | Qty: ${item.quantity} | Unit: $${item.unitPrice} | Ext: $${ext}`);
                stainlessCost1 = ext;
            }
        });

        console.log(`\nPass 1 Verification:`);
        console.log(`Expected Base String: $4200.00 | Actual Base Sum: $${baseCost1.toFixed(2)}`);
        console.log(`Expected SS Uplift: $2730.00 | Actual SS Uplift: $${stainlessCost1.toFixed(2)}`);

        if (stainlessCost1 === 2730) {
            console.log('✅ PASS 1 SUCCESS: Stainless correctly calculated on initial sync!');
        } else {
            console.error('❌ PASS 1 FAILED: Timing issue persists or math is wrong on fresh sync.');
        }

        // --- PASS 2: Re-Sync ---
        console.log('\n>>> RUNNING SECOND SYNC (Existing Board) <<<');
        await syncBoardItems(testBoard.id, testConfig, { forceTiers: true });

        // Retrieve items after pass 2
        const pass2Items = await prisma.item.findMany({ where: { boardId: testBoard.id } });

        let stainlessCost2 = 0;
        let baseCost2 = 0;

        console.log('\n--- Pass 2 Final State ---');
        pass2Items.forEach(item => {
            const name = item.name;
            if (['1B-TIERS-400', '1B-COMPARTMENTS', '1B-BASE', '1B-DOORS', '1B-600MM', '1B-800MM'].includes(name)) {
                const ext = Number(item.quantity) * item.unitPrice;
                baseCost2 += ext;
            }
            if (name === '1B-SS-2B') {
                const ext = Number(item.quantity) * item.unitPrice;
                stainlessCost2 = ext;
            }
        });

        console.log(`\nPass 2 Verification:`);
        console.log(`Expected Base String: $4200.00 | Actual Base Sum: $${baseCost2.toFixed(2)}`);
        console.log(`Expected SS Uplift: $2730.00 | Actual SS Uplift: $${stainlessCost2.toFixed(2)}`);

        if (stainlessCost2 === 2730 && stainlessCost1 === stainlessCost2) {
            console.log('✅ PASS 2 SUCCESS: Identical idempotent output on re-sync!');
        } else {
            console.error('❌ PASS 2 FAILED: Value shifted or degraded on re-sync.');
        }

    } finally {
        // Cleanup
        console.log('\nCleaning up test data...');
        await prisma.item.deleteMany({ where: { boardId: testBoard.id } });
        await prisma.board.delete({ where: { id: testBoard.id } });
        console.log('Done.');
        await prisma.$disconnect();
    }
}

runTest().catch(console.error);
