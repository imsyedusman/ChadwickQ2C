
import { PrismaClient } from '@prisma/client';
import { AutomationService } from '../lib/automation';

const prisma = new PrismaClient();

async function main() {
    console.log('--- MCCB Pairing Lifecycle Verification ---');

    // 1. Setup Board (50kA -> N3)
    let board = await prisma.board.findFirst({ where: { name: 'Lifecycle Test Board' } });
    if (!board) {
        const quote = await prisma.quote.findFirst();
        if (!quote) throw new Error("No quotes found.");
        board = await prisma.board.create({
            data: { quoteId: quote.id, name: 'Lifecycle Test Board', mccbVariant: 'N3', items: { create: [] } } as any
        });
    } else {
        await prisma.item.deleteMany({ where: { boardId: board.id } });
        await prisma.board.update({ where: { id: board.id }, data: { mccbVariant: 'N3' } as any });
    }
    console.log(`[SETUP] Board Ready: ${board.id} (N3)`);

    // Helper to count bases
    const checkBase = async (expectedQty: number, label: string) => {
        const items = await prisma.item.findMany({ where: { boardId: board.id } });
        const base = items.find(i => (i as any).partNumber === 'C10N3');
        if (expectedQty === 0) {
            if (!base) console.log(`[PASS] ${label}: Base correctly removed.`);
            else console.error(`[FAIL] ${label}: Base still exists! Qty: ${base.quantity}`);
        } else {
            if (base && base.quantity.toNumber() === expectedQty) {
                console.log(`[PASS] ${label}: Base found with Qty ${base.quantity}.`);
                // Check metadata
                if (base.category === 'Switchboard' && base.subcategory !== 'MCCB Base' && base.name === 'C10N3') {
                    console.log(`       Metadata Correct: Cat=${base.category}, Sub=${base.subcategory}, Name=${base.name}`);
                } else {
                    console.warn(`       Metadata Warning: Cat=${base.category}, Sub=${base.subcategory}, Name=${base.name}`);
                }
            } else {
                console.error(`[FAIL] ${label}: Base missing or wrong qty. Found: ${base?.quantity.toNumber()}`);
            }
        }
    };

    // 2. Add Trip Unit A (Qty 1) -> Base Qty 1
    console.log('[STEP 1] Adding Trip Unit A (Qty 1)...');
    await prisma.item.create({
        data: {
            boardId: board.id, category: 'Switchboard', name: 'Trip A', partNumber: 'C1035E100',
            description: 'Trip Unit A', quantity: 1, unitPrice: 100, cost: 100,
            mccbVariant: null
        } as any
    });
    await AutomationService.syncMccbTripBasePairs(board.id);
    await checkBase(1, 'Base Creation');

    // 3. Update Trip Unit A -> Qty 2 -> Base Qty 2
    console.log('[STEP 2] Updating Trip Unit A Qty to 2...');
    const tripA = await prisma.item.findFirst({ where: { boardId: board.id, partNumber: 'C1035E100' } });
    if (tripA) {
        await prisma.item.update({ where: { id: tripA.id }, data: { quantity: 2, cost: 200 } });
        await AutomationService.syncMccbTripBasePairs(board.id);
        await checkBase(2, 'Base Update');
    }

    // 4. Add Trip Unit B (Qty 1) (Same Variant) -> Base Qty 3
    console.log('[STEP 3] Adding Trip Unit B (Qty 1, Same Variant)...');
    await prisma.item.create({
        data: {
            boardId: board.id, category: 'Switchboard', name: 'Trip B', partNumber: 'C1035E100', // Using same part for simplicity of test, but different item entry simulation
            description: 'Trip Unit B', quantity: 1, unitPrice: 100, cost: 100,
            mccbVariant: null
        } as any
    });
    await AutomationService.syncMccbTripBasePairs(board.id);
    await checkBase(3, 'Base Aggregation');

    // 5. Delete Trip Unit B -> Base Qty 2
    console.log('[STEP 4] Deleting Trip Unit B...');
    const tripB = (await prisma.item.findMany({ where: { boardId: board.id, partNumber: 'C1035E100' } })).pop(); // Get last one
    if (tripB) {
        await prisma.item.delete({ where: { id: tripB.id } });
        await AutomationService.syncMccbTripBasePairs(board.id);
        await checkBase(2, 'Base Reduction');
    }

    // 6. Delete Trip Unit A -> Base Qty 0 (Removed)
    console.log('[STEP 5] Deleting Trip Unit A...');
    // We already have tripA id but check if it's still clean
    const remainingTrips = await prisma.item.findMany({ where: { boardId: board.id, partNumber: 'C1035E100' } });
    if (remainingTrips.length > 0) {
        await prisma.item.delete({ where: { id: remainingTrips[0].id } });
        await AutomationService.syncMccbTripBasePairs(board.id);
        await checkBase(0, 'Base Cleanup');
    }
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
