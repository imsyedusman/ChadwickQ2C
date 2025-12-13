
import { PrismaClient } from '@prisma/client';
import { syncBoardItems, BoardConfig } from './lib/board-item-service';

const prisma = new PrismaClient();

async function runTest() {
    console.log('--- Starting Cubic Options Test (Root) ---');

    // 1. Ensure Catalog Item Exists
    const compartmentPn = '1A-COMPARTMENTS';
    let catalogItem = await prisma.catalogItem.findFirst({ where: { partNumber: compartmentPn } });

    if (!catalogItem) {
        console.log('Seeding 1A-COMPARTMENTS into catalog...');
        catalogItem = await prisma.catalogItem.create({
            data: {
                partNumber: compartmentPn,
                description: 'Total No. of compartments',
                category: 'Basics',
                unitPrice: 300, // Validating against this price
                labourHours: 1.2
            }
        });
    } else {
        console.log(`Using existing catalog item: ${compartmentPn} @ $${catalogItem.unitPrice}`);
    }

    // 2. Create Dummy Board
    const quote = await prisma.quote.upsert({
        where: { quoteNumber: 'TEST-Q-CUBIC' },
        update: {},
        create: {
            quoteNumber: 'TEST-Q-CUBIC',
            clientName: 'Test Client',
            status: 'DRAFT'
        }
    });

    const board = await prisma.board.create({
        data: {
            quoteId: quote.id,
            name: 'Test Cubic Board',
            type: 'Main Switchboard (MSB)'
        }
    });

    try {
        // 3. Test Cubic Configuration
        console.log('\n--- Test 1: Cubic with Options ---');
        const config: BoardConfig = {
            ctMetering: 'No',
            meterPanel: 'No',
            enclosureType: 'Cubic',
            totalCompartments: 10,
            isOver50kA: 'Yes',
            isNonStandardColour: 'Yes',
            // Defaults
            enclosureDepth: '400',
            insulationLevel: 'air'
        };

        await syncBoardItems(board.id, config);

        // Verify Items
        const items = await prisma.item.findMany({ where: { boardId: board.id } });

        const iCompartments = items.find(i => i.name === '1A-COMPARTMENTS');
        const i50kA = items.find(i => i.name === '1A-50KA');
        const iColour = items.find(i => i.name === '1A-COLOUR');

        // Check 1A-COMPARTMENTS
        if (iCompartments && iCompartments.quantity === 10) {
            console.log('PASS: 1A-COMPARTMENTS added with Qty 10');
        } else {
            console.error('FAIL: 1A-COMPARTMENTS missing or wrong qty', iCompartments);
        }

        // Check 1A-50KA
        // Expected Cost = (10 * unitPrice) / 4
        const expected50kACost = (10 * catalogItem.unitPrice) / 4;
        if (i50kA && Math.abs(i50kA.unitPrice - expected50kACost) < 0.01 && i50kA.quantity === 1) {
            console.log(`PASS: 1A-50KA added with Price $${i50kA.unitPrice} (Expected $${expected50kACost})`);
        } else {
            console.error(`FAIL: 1A-50KA mismatch. Got Price $${i50kA?.unitPrice}, Qty ${i50kA?.quantity}. Expected $${expected50kACost}`);
        }

        // Check 1A-COLOUR
        // Expected: Qty 10, Price 80
        if (iColour && iColour.quantity === 10 && iColour.unitPrice === 80) {
            console.log('PASS: 1A-COLOUR added with Qty 10, Price $80');
        } else {
            console.error('FAIL: 1A-COLOUR mismatch', iColour);
        }


        // 4. Test Zero Compartments (Should remove items)
        console.log('\n--- Test 2: Zero Compartments ---');
        const configZero = { ...config, totalCompartments: 0 };
        await syncBoardItems(board.id, configZero);

        const itemsZero = await prisma.item.findMany({ where: { boardId: board.id } });
        const hasCubicItems = itemsZero.some(i => ['1A-COMPARTMENTS', '1A-50KA', '1A-COLOUR'].includes(i.name));

        if (!hasCubicItems) {
            console.log('PASS: All Cubic items removed when Compartments = 0');
        } else {
            console.error('FAIL: Cubic items still exist', itemsZero.map(i => i.name));
        }


        // 5. Test Custom Switch (Should remove items even if compartments > 0 theoretically, though UI hides inputs)
        console.log('\n--- Test 3: Switch to Custom ---');
        const configCustom: BoardConfig = {
            ...config,
            enclosureType: 'Custom',
            totalCompartments: 10 // Data might persist in state but logic should ignore
        };
        await syncBoardItems(board.id, configCustom);

        const itemsCustom = await prisma.item.findMany({ where: { boardId: board.id } });
        const hasCubicItemsCustom = itemsCustom.some(i => ['1A-COMPARTMENTS', '1A-50KA', '1A-COLOUR'].includes(i.name));

        if (!hasCubicItemsCustom) {
            console.log('PASS: All Cubic items removed when Enclosure = Custom');
        } else {
            console.error('FAIL: Cubic items persist in Custom mode', itemsCustom.map(i => i.name));
        }

    } catch (e) {
        console.error('Test Error:', e);
    } finally {
        // Cleanup
        await prisma.board.delete({ where: { id: board.id } });
        // await prisma.quote.delete({ where: { quoteNumber: 'TEST-Q-CUBIC' } }); 
        await prisma.$disconnect();
    }
}

runTest();
