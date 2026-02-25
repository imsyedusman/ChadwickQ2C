import { PrismaClient } from '@prisma/client';
import { syncBoardItems } from '../lib/board-item-service';

const prisma = new PrismaClient();

async function runVerification() {
    console.log('--- Starting Digital Meter Verification ---');

    let quoteId = '';
    const existingQuote = await prisma.quote.findFirst();
    if (existingQuote) {
        quoteId = existingQuote.id;
    } else {
        const q = await prisma.quote.create({
            data: {
                quoteNumber: 'TEST-Q-DIGITAL',
                projectRef: 'TEST',
                status: 'DRAFT'
            }
        });
        quoteId = q.id;
    }

    const board = await prisma.board.create({
        data: {
            quoteId: quoteId,
            name: 'VERIFY-DIGITAL-METER',
            type: 'Main Switchboard',
            config: JSON.stringify({})
        }
    });

    console.log(`Using Temp Board ID: ${board.id}`);

    try {
        console.log('\n[TEST] 1. Add Digital Meter (A9MEM3155)');

        // Manually insert a digital meter item
        await prisma.item.create({
            data: {
                boardId: board.id,
                category: 'Switchboard',
                subcategory: 'Power Meters',
                name: 'A9MEM3155',
                partNumber: 'A9MEM3155',
                description: 'Test Meter',
                quantity: 1,
                unitPrice: 100,
                labourHours: 1,
                cost: 100,
                isSystemManaged: false
            } as any
        });

        // Trigger sync
        await syncBoardItems(board.id, {
            enclosureType: 'Custom',
            tierCount: 0,
            meterPanel: 'No',
            ctMetering: 'No',
            wholeCurrentMetering: 'No'
        } as any);

    } finally {
        console.log('\nCleaning up...');
        await prisma.item.deleteMany({ where: { boardId: board.id } });
        await prisma.board.delete({ where: { id: board.id } });
        await prisma.$disconnect();
    }
}

runVerification().catch(console.error);
