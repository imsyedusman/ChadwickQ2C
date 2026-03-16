
import { PrismaClient } from '@prisma/client';
import { AutomationService } from '@/lib/automation';

const prisma = new PrismaClient();

async function testGC() {
    const boardId = 'test-board-gc-' + Date.now();
    
    try {
        console.log(`Starting General Control Automation Test on board: ${boardId}`);

        // 1. Create a dummy board
        await prisma.board.create({
            data: {
                id: boardId,
                name: 'Test General Control Board',
                quoteId: 'dummy-quote-id' // Ensure a quote exists or handled
            } as any
        });

        // 2. Add some GC items
        console.log('Adding GC items...');
        await prisma.item.createMany({
            data: [
                {
                    boardId,
                    category: 'Switchboard',
                    subcategory: 'Miscellaneous > General Control > Extras',
                    name: 'A9C20134',
                    partNumber: 'A9C20134',
                    description: 'Additional 4NC Contactors',
                    quantity: 2,
                    unitPrice: 44.35,
                    labourHours: 0.75,
                    cost: 88.7
                },
                {
                    boardId,
                    category: 'Switchboard',
                    subcategory: 'Miscellaneous > General Control > Extras',
                    name: 'CCT15854',
                    partNumber: 'CCT15854',
                    description: 'Time Switch - 1 Channel',
                    quantity: 1,
                    unitPrice: 100.59,
                    labourHours: 0.5,
                    cost: 100.59
                }
            ] as any
        });

        // 3. Run Automation
        console.log('Running Board Automation...');
        await AutomationService.runBoardAutomationReconciliation(boardId);

        // 4. Verify Results
        let items = await prisma.item.findMany({ where: { boardId } });
        
        const fuse = items.find(i => i.partNumber === 'CHD-FUSE-20A-DIN');
        const wiring = items.find(i => i.partNumber === 'CHD-WIRING-CONTROL');

        console.log('\nVerification 1 (Initial):');
        console.log(`Fuse Qty: ${fuse?.quantity} (Expected 3)`);
        console.log(`Wiring Qty: ${wiring?.quantity} (Expected 24: 2*10 + 1*4)`);

        if (Number(fuse?.quantity) !== 3 || Number(wiring?.quantity) !== 24) {
            throw new Error('Verification 1 FAILED');
        }

        // 5. Update quantities
        console.log('\nUpdating quantities...');
        const contactor = items.find(i => i.partNumber === 'A9C20134');
        if (contactor) {
            await prisma.item.update({
                where: { id: contactor.id },
                data: { quantity: 1, cost: 44.35 }
            });
        }

        await AutomationService.runBoardAutomationReconciliation(boardId);

        items = await prisma.item.findMany({ where: { boardId } });
        const fuse2 = items.find(i => i.partNumber === 'CHD-FUSE-20A-DIN');
        const wiring2 = items.find(i => i.partNumber === 'CHD-WIRING-CONTROL');

        console.log('Verification 2 (Updated):');
        console.log(`Fuse Qty: ${fuse2?.quantity} (Expected 2)`);
        console.log(`Wiring Qty: ${wiring2?.quantity} (Expected 14: 1*10 + 1*4)`);

        if (Number(fuse2?.quantity) !== 2 || Number(wiring2?.quantity) !== 14) {
            throw new Error('Verification 2 FAILED');
        }

        // 6. Test Removal
        console.log('\nRemoving all GC items...');
        await prisma.item.deleteMany({
            where: {
                boardId,
                partNumber: { in: ['A9C20134', 'CCT15854'] }
            }
        });

        await AutomationService.runBoardAutomationReconciliation(boardId);

        items = await prisma.item.findMany({ where: { boardId } });
        const fuse3 = items.find(i => i.partNumber === 'CHD-FUSE-20A-DIN');
        const wiring3 = items.find(i => i.partNumber === 'CHD-WIRING-CONTROL');

        console.log('Verification 3 (Cleanup):');
        console.log(`Fuse exists: ${!!fuse3} (Expected false)`);
        console.log(`Wiring exists: ${!!wiring3} (Expected false)`);

        if (fuse3 || wiring3) {
            throw new Error('Verification 3 FAILED');
        }

        console.log('\nALL TESTS PASSED!');

    } catch (e) {
        console.error('TEST FAILED:', e);
    } finally {
        // Cleanup test board
        console.log(`Cleaning up test board ${boardId}...`);
        await prisma.item.deleteMany({ where: { boardId } });
        await prisma.board.delete({ where: { id: boardId } });
        await prisma.$disconnect();
    }
}

testGC();
