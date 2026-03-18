import { PrismaClient } from '@prisma/client';
import { AutomationService } from '../lib/automation';

const prisma = new PrismaClient();

async function testAdditionalControlWiring() {
    console.log('--- Testing Additional Control Wiring Automation ---');

    // 1. Setup: Find or Create a Test Board
    let board = await prisma.board.findFirst({
        where: { name: 'Test Board for Automation' },
        include: { items: true }
    });

    if (!board) {
        const quote = await prisma.quote.create({
            data: {
                quoteNumber: 'Q-TEST-AUTOMATION',
                description: 'Test Automation Quote',
                status: 'DRAFT',
                revision: 1
            } as any
        });
        board = await prisma.board.create({
            data: {
                quoteId: quote.id,
                name: 'Test Board for Automation'
            } as any,
            include: { items: true }
        });
    }

    console.log(`Using Board ID: ${board.id}`);

    // Cleanup existing items
    await prisma.item.deleteMany({ where: { boardId: board.id } });

    // 2. Add a 3P Contactor
    console.log('\nStep 1: Adding LC1D25U7 (Qty 2)');
    await prisma.item.create({
        data: {
            boardId: board.id,
            category: 'Switchboard',
            subcategory: 'Control Gear',
            name: 'LC1D25U7',
            partNumber: 'LC1D25U7',
            description: 'TeSys D contactor - 3P(3 NO) - AC-3 - <= 440 V 25 A - 240 V AC coil',
            quantity: 2,
            unitPrice: 100,
            cost: 200,
            isSystemManaged: false
        } as any
    });

    // 3. Run Automation
    console.log('Running Automation...');
    await AutomationService.runBoardAutomationReconciliation(board.id);

    // 4. Verify Results
    let items = await prisma.item.findMany({ where: { boardId: board.id } });
    let wiringItem = items.find(i => i.partNumber === 'CHD-WIRING-CONTROL');

    if (wiringItem) {
        console.log('SUCCESS: CHD-WIRING-CONTROL found.');
        console.log(`Quantity: ${wiringItem.quantity} (Expected: 4)`);
        console.log(`System Tag: ${(wiringItem as any).systemTag} (Expected: CONTROL_WIRING)`);
    } else {
        console.error('FAILED: CHD-WIRING-CONTROL not found.');
    }

    // 5. Add Another Contactor
    console.log('\nStep 2: Adding LC1D32U7 (Qty 1)');
    await prisma.item.create({
        data: {
            boardId: board.id,
            category: 'Switchboard',
            subcategory: 'Control Gear',
            name: 'LC1D32U7',
            partNumber: 'LC1D32U7',
            description: 'TeSys D contactor - 3P(3 NO) - AC-3 - <= 440 V 32 A - 240 V AC coil',
            quantity: 1,
            unitPrice: 120,
            cost: 120,
            isSystemManaged: false
        } as any
    });

    console.log('Running Automation...');
    await AutomationService.runBoardAutomationReconciliation(board.id);

    items = await prisma.item.findMany({ where: { boardId: board.id } });
    wiringItem = items.find(i => i.partNumber === 'CHD-WIRING-CONTROL');

    if (wiringItem) {
        console.log(`Updated Quantity: ${wiringItem.quantity} (Expected: 6)`);
    } else {
        console.error('FAILED: CHD-WIRING-CONTROL not found after update.');
    }

    // 6. Test Removal
    console.log('\nStep 3: Removing LC1D25U7');
    const contactorToDelete = items.find(i => i.partNumber === 'LC1D25U7');
    if (contactorToDelete) {
        await prisma.item.delete({ where: { id: contactorToDelete.id } });
    }

    console.log('Running Automation...');
    await AutomationService.runBoardAutomationReconciliation(board.id);

    items = await prisma.item.findMany({ where: { boardId: board.id } });
    wiringItem = items.find(i => i.partNumber === 'CHD-WIRING-CONTROL');

    if (wiringItem) {
        console.log(`Reduced Quantity: ${wiringItem.quantity} (Expected: 2)`);
    } else {
        console.error('FAILED: CHD-WIRING-CONTROL not found after partial removal.');
    }

    // 7. Test Total Removal
    console.log('\nStep 4: Removing LC1D32U7');
    const lastContactor = items.find(i => i.partNumber === 'LC1D32U7');
    if (lastContactor) {
        await prisma.item.delete({ where: { id: lastContactor.id } });
    }

    console.log('Running Automation...');
    await AutomationService.runBoardAutomationReconciliation(board.id);

    items = await prisma.item.findMany({ where: { boardId: board.id } });
    wiringItem = items.find(i => i.partNumber === 'CHD-WIRING-CONTROL');

    if (!wiringItem) {
        console.log('SUCCESS: CHD-WIRING-CONTROL removed after all contactors deleted.');
    } else {
        console.error(`FAILED: CHD-WIRING-CONTROL still exists (Qty: ${wiringItem.quantity})`);
    }

    // 8. Test Isolation from GC
    console.log('\nStep 5: Testing Isolation from GC');
    console.log('Adding Regular GC item (PBELKIT4)');
    await prisma.item.create({
        data: {
            boardId: board.id,
            category: 'Switchboard',
            subcategory: 'Control Gear',
            name: 'PBELKIT4',
            partNumber: 'PBELKIT4',
            description: 'Test GC Item',
            quantity: 1,
            unitPrice: 50,
            cost: 50,
            isSystemManaged: false
        } as any
    });

    console.log('Running Automation...');
    await AutomationService.runBoardAutomationReconciliation(board.id);

    items = await prisma.item.findMany({ where: { boardId: board.id } });
    const gcItems = items.filter(i => (i as any).systemTag === 'GENERAL_CONTROL');
    const wiringItems = items.filter(i => (i as any).systemTag === 'CONTROL_WIRING');

    console.log(`GENERAL_CONTROL items: ${gcItems.length} (Expected: 1 - Fuse. Wiring should be 0 as PBELKIT4 has 0 wires)`);
    console.log(`CONTROL_WIRING items: ${wiringItems.length} (Expected: 0)`);

    console.log('\nAll tests complete.');
}

testAdditionalControlWiring()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
