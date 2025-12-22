
import { PrismaClient } from '@prisma/client';
import { syncBoardItems, BoardConfig } from '../lib/board-item-service';

const prisma = new PrismaClient();

async function runVerification() {
    console.log('--- Starting Metering Verification ---');

    // 1. Create a temporary board
    // Create a Quote first to satisfy FK
    let quoteId = '';
    const existingQuote = await prisma.quote.findFirst();
    if (existingQuote) {
        quoteId = existingQuote.id;
    } else {
        const q = await prisma.quote.create({ data: { number: 'TEST-Q', version: 1, name: 'TEST' } });
        quoteId = q.id;
    }

    const board = await prisma.board.create({
        data: {
            quoteId: quoteId,
            name: 'VERIFY-METERING',
            placement: 'Indoor',
            installation: 'Wall mount',
            sensorOrientation: 'Bottom',
            fieldWiringOrientation: 'Bottom'
        }
    });

    console.log(`Using Temp Board ID: ${board.id}`);

    try {
        // --- TEST CASE 1: Whole Current (Standard) ---
        // Expect: 100A-PANEL present.
        console.log('\n[TEST 1] WC Mode (63A, WC=Yes, No CT)');
        await syncBoardItems(board.id, {
            meterPanel: 'Yes',
            wholeCurrentMetering: 'Yes',
            ctMetering: 'No',
            currentRating: '63A',
            enclosureType: 'Custom',
            tierCount: 0
        });
        await checkItems(board.id, 'TEST 1', ['100A-PANEL'], ['CT-PANEL']);


        // --- TEST CASE 2: CT Mode (Explicit) ---
        // Expect: CT-PANEL present, 100A-PANEL ABSENT.
        // Current Bug: 100A-PANEL is probably present because meterPanel='Yes'.
        console.log('\n[TEST 2] CT Mode (Explicit: CT=Yes, WC=No)');
        await syncBoardItems(board.id, {
            meterPanel: 'Yes',
            wholeCurrentMetering: 'No',
            ctMetering: 'Yes',
            ctQuantity: 1,
            currentRating: '63A', // Even if small amps, CT forced
            enclosureType: 'Custom',
            tierCount: 0
        });
        await checkItems(board.id, 'TEST 2', ['CT-PANEL'], ['100A-PANEL']);


        // --- TEST CASE 3: CT Mode (>100A Implied) ---
        // Expect: CT-PANEL present, 100A-PANEL ABSENT.
        console.log('\n[TEST 3] CT Mode (Implied: 400A)');
        await syncBoardItems(board.id, {
            meterPanel: 'Yes',
            wholeCurrentMetering: 'Yes', // user tried to say Yes
            ctMetering: 'No',            // but Amps force CT
            currentRating: '400A',
            enclosureType: 'Custom',
            tierCount: 0
        });
        await checkItems(board.id, 'TEST 3', ['CT-PANEL'], ['100A-PANEL']);

        // --- TEST CASE 4: CT Mode (Implied > 100A with messy string) ---
        console.log('\n[TEST 4] CT Mode (Implied: 200A messy string)');
        await syncBoardItems(board.id, {
            meterPanel: 'Yes',
            wholeCurrentMetering: 'Yes',
            ctMetering: 'No',
            currentRating: '200A', // Should parse to 200
            enclosureType: 'Custom',
            tierCount: 0
        });
        await checkItems(board.id, 'TEST 4', ['CT-PANEL'], ['100A-PANEL']);

    } finally {
        // Cleanup
        console.log('\nCleaning up...');
        await prisma.item.deleteMany({ where: { boardId: board.id } });
        await prisma.board.delete({ where: { id: board.id } });
        await prisma.$disconnect();
    }
}

async function checkItems(boardId: string, testName: string, required: string[], forbidden: string[]) {
    const items = await prisma.item.findMany({ where: { boardId } });
    const itemNames = items.map(i => i.name);

    // console.log(`Items found: ${itemNames.join(', ')}`);

    let passed = true;
    for (const req of required) {
        if (!itemNames.includes(req)) {
            console.error(`❌ ${testName} FAILED: Missing required item '${req}'`);
            passed = false;
        }
    }
    for (const forb of forbidden) {
        if (itemNames.includes(forb)) {
            console.error(`❌ ${testName} FAILED: Found forbidden item '${forb}'`);
            passed = false;
        }
    }

    if (passed) console.log(`✅ ${testName} PASSED`);
}

runVerification().catch(console.error);
