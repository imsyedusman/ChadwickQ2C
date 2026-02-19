
import { PrismaClient } from '@prisma/client';
import { AutomationService } from '../lib/automation';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Verification...');

    // 1. Create a Test Board
    const quote = await prisma.quote.findFirst();
    if (!quote) throw new Error('No quote found to attach board to');

    const board = await prisma.board.create({
        data: {
            quoteId: quote.id,
            name: 'Generic Verification Board',
            type: 'Test'
        }
    });
    console.log(`Created Board: ${board.id}`);

    try {
        // 2. Add a Trip Unit (C1035E100) -> Variant B3
        // user mapping: C10B3 -> C1035E100 (Variant B3)
        // We simulate adding the Trip Unit Item
        console.log('Adding Trip Unit C1035E100 (Variant B3 context)...');
        await prisma.item.create({
            data: {
                boardId: board.id,
                name: 'C1035E100', // Trip Part
                partNumber: 'C1035E100',
                category: 'Switchboard',
                subcategory: 'MCCB B3 Variant', // Context for derivation
                quantity: 2,
                unitPrice: 100
            }
        });

        // 3. Run Sync
        console.log('Running Sync...');
        await AutomationService.syncMccbTripBasePairs(board.id);

        // 4. Check Base Item
        const items = await prisma.item.findMany({ where: { boardId: board.id } });
        const baseItem = items.find(i => i.isSystemManaged && i.partNumber === 'C10B3');

        if (baseItem) {
            console.log('PASS: Base Item C10B3 found.');
            console.log(`Qty: ${baseItem.quantity} (Expected: 2)`);
            if (baseItem.quantity.toNumber() !== 2) throw new Error('Qty Mismatch');
        } else {
            console.error('FAIL: Base Item C10B3 NOT found.');
            items.forEach(i => console.log(` - ${i.name} (${i.partNumber}) [${i.isSystemManaged ? 'SYS' : 'USER'}]`));
            throw new Error('Verification Failed');
        }

        // 5. Update Qty
        console.log('Updating Trip Qty to 5...');
        const tripItem = items.find(i => i.partNumber === 'C1035E100');
        if (tripItem) {
            await prisma.item.update({
                where: { id: tripItem.id },
                data: { quantity: 5 }
            });
            await AutomationService.syncMccbTripBasePairs(board.id);

            const updatedBase = await prisma.item.findFirst({ where: { id: baseItem.id } });
            console.log(`Updated Base Qty: ${updatedBase?.quantity} (Expected: 5)`);
            if (updatedBase?.quantity.toNumber() !== 5) throw new Error('Update Qty Verification Failed');
        }

        // 6. Delete Trip
        console.log('Deleting Trip Unit...');
        if (tripItem) {
            await prisma.item.delete({ where: { id: tripItem.id } });
            await AutomationService.syncMccbTripBasePairs(board.id);

            const deletedBase = await prisma.item.findFirst({ where: { id: baseItem.id } });
            if (!deletedBase) {
                console.log('PASS: Base Item removed.');
            } else {
                console.error('FAIL: Base Item still exists.');
                throw new Error('Deletion Verification Failed');
            }
        }

    } catch (e) {
        console.error(e);
        throw e;
    } finally {
        // Cleanup
        await prisma.board.delete({ where: { id: board.id } });
        console.log('Cleanup Done.');
        await prisma.$disconnect();
    }
}

main();
