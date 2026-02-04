
import { PrismaClient } from '@prisma/client';
import { normalizePartNumber } from '../lib/normalization';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Case-Insensitive Automation ---');

    // 1. Setup Board
    const board = await prisma.board.create({
        data: {
            quote: { create: { quoteNumber: `CASE-TEST-${Date.now()}`, status: 'DRAFT', settingsSnapshot: '{}' } },
            name: 'Case Test Board',
            type: 'MSB',
            config: '{}'
        }
    });

    // 2. Ensure Catalog Item exists (Normalized or Mixed)
    // We want to test that if Catalog has "ENB48" or "enb48" (even if we backfilled, let's pretend we are unsure), 
    // and Rule asks for "enb48" (normalized ENB48), it matches.

    // Create 'ENB48' in catalog
    await prisma.catalogItem.deleteMany({ where: { partNumber: { in: ['enb48', 'ENB48'] } } });
    await prisma.catalogItem.create({
        data: {
            partNumber: 'ENB48', // Canonical
            description: 'Link 48 Way',
            unitPrice: 100,
            category: 'Switchboard',
            subcategory: 'Neutral and Earth Links - 165A'
        }
    });

    const boardId = board.id;
    const { AutomationService } = await import('../lib/automation');

    console.log('--- TEST: Add Chassis with Mixed Case Input ---');
    // Add 'sau40048183' (lowercase)
    await prisma.item.create({
        data: {
            boardId,
            category: 'Switchboard',
            name: 'Mixed Case Chassis',
            partNumber: 'sau40048183', // LOWERCASE INPUT
            quantity: 1,
            unitPrice: 100,
            cost: 100,
            description: 'Test Chassis',
            isSystemManaged: false
        }
    });

    // Run Automation
    // The rule expects 'SAU40048183' (Upper). Our input is 'sau40048183'.
    // Automation should normalize input to SAU40048183 -> Match Rule -> Output ENB48.
    // Catalog has ENB48.
    // Automation should find it.

    await AutomationService.applyPairingRules(boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');

    const links = await prisma.item.findMany({
        where: { boardId, systemTag: 'MCB_CHASSIS_LINK' }
    });

    if (links.length === 1 && normalizePartNumber(links[0].partNumber) === 'ENB48') {
        console.log('PASSED: Link created despite input casing difference.');
        console.log(`Link Part: ${links[0].partNumber} (Expected Normalized: ENB48)`);
    } else {
        console.error('FAILED: Link not created.');
        console.log(links);

        // Debug
        const logs = await AutomationService.applyPairingRules(boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');
        console.log('Debug Warnings:', logs.warnings);
    }
}

main().finally(() => prisma.$disconnect());
