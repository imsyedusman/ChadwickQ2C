
import { PrismaClient } from '@prisma/client';
import { AutomationService } from '../lib/automation';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Accessory Dependency Model Verification ---');

    // 1. Setup Board
    let board = await prisma.board.findFirst({ where: { name: 'Accessory Test Board' } });
    if (!board) {
        const quote = await prisma.quote.findFirst();
        if (!quote) throw new Error("No quotes found.");
        board = await prisma.board.create({
            data: { quoteId: quote.id, name: 'Accessory Test Board', mccbVariant: 'N3', items: { create: [] } } as any
        });
    } else {
        await prisma.item.deleteMany({ where: { boardId: board.id } });
    }
    console.log(`[SETUP] Board Ready: ${board.id}`);

    // 2. Add MCCB 1 (Qty 1) -> Should get 2 shields, 1 handle
    console.log('[STEP 1] Adding MCCB 1 (Qty 1)...');
    const mccb1 = await prisma.item.create({
        data: {
            boardId: board.id, category: 'Switchboard', name: 'MCCB 1', partNumber: 'NSX100-TEST-1',
            description: 'MCCB 1', quantity: 1, unitPrice: 500, cost: 500,
            productFrame: 'NSX100-250', isSystemManaged: false
        } as any
    });
    await AutomationService.syncBoardAccessories(board.id);

    const accessories1 = await prisma.item.findMany({ where: { parentItemId: mccb1.id } });
    console.log(`[VERIFY 1] Found ${accessories1.length} accessories for MCCB 1.`);
    if (accessories1.length === 2) { // 1 Shield SKU (Qty 2), 1 Handle SKU (Qty 1) - Wait, sync logic groups by SKU for SAME parent.
        console.log('[PASS] Accessories correctly linked to MCCB 1.');
    } else {
        console.error(`[FAIL] Expected 2 accessory items for MCCB 1, found ${accessories1.length}.`);
    }

    // 3. Add MCCB 2 (Qty 1) -> Should get its OWN 2 accessories
    console.log('[STEP 2] Adding MCCB 2 (Qty 1)...');
    const mccb2 = await prisma.item.create({
        data: {
            boardId: board.id, category: 'Switchboard', name: 'MCCB 2', partNumber: 'NSX100-TEST-2',
            description: 'MCCB 2', quantity: 1, unitPrice: 500, cost: 500,
            productFrame: 'NSX100-250', isSystemManaged: false
        } as any
    });
    await AutomationService.syncBoardAccessories(board.id);

    const allAccessories = await prisma.item.findMany({ where: { boardId: board.id, systemTag: 'MCCB_ACCESSORIES' } });
    console.log(`[VERIFY 2] Total accessories on board: ${allAccessories.length}`);
    if (allAccessories.length === 4) {
        console.log('[PASS] Accessories are independent per breaker.');
    } else {
        console.error(`[FAIL] Expected 4 accessory items total, found ${allAccessories.length}.`);
    }

    // 4. Update MCCB 1 Qty to 2 -> Accessories for MCCB 1 should scale
    console.log('[STEP 3] Updating MCCB 1 Qty to 2...');
    await prisma.item.update({ where: { id: mccb1.id }, data: { quantity: 2 } });
    await AutomationService.syncBoardAccessories(board.id);

    const updatedAcc1 = await prisma.item.findMany({ where: { parentItemId: mccb1.id } });
    const shield1 = updatedAcc1.find(i => i.systemRuleType === 'MCCB_ACCESSORY_SHIELD');
    const handle1 = updatedAcc1.find(i => i.systemRuleType === 'MCCB_ACCESSORY_HANDLE');

    if (shield1?.quantity.toNumber() === 4 && handle1?.quantity.toNumber() === 2) {
        console.log('[PASS] Accessories correctly scaled with parent quantity.');
    } else {
        console.error(`[FAIL] Scaling failed. Shield: ${shield1?.quantity}, Handle: ${handle1?.quantity}`);
    }

    // 5. Delete MCCB 1 -> Its accessories should disappear (Cascade)
    console.log('[STEP 4] Deleting MCCB 1...');
    await prisma.item.delete({ where: { id: mccb1.id } });
    await AutomationService.syncBoardAccessories(board.id);

    const remainingAcc = await prisma.item.findMany({ where: { boardId: board.id, systemTag: 'MCCB_ACCESSORIES' } });
    console.log(`[VERIFY 4] Remaining accessories on board: ${remainingAcc.length}`);
    if (remainingAcc.length === 2 && remainingAcc.every(a => (a as any).parentItemId === mccb2.id)) {
        console.log('[PASS] Accessories for deleted parent removed, others preserved.');
    } else {
        console.error(`[FAIL] Orphaned accessories or incorrect cleanup. Count: ${remainingAcc.length}`);
    }

    // 6. Test Quantity=0 Exclusion (Phase 3 Simplification)
    console.log('[STEP 5] Setting quantity to 0 for MCCB 2 Accessory...');
    const accToExclude = remainingAcc[0];
    await prisma.item.update({
        where: { id: accToExclude.id },
        data: { quantity: 0, isSystemManaged: false } as any
    });

    // Run sync again - should NOT force back to 1
    await AutomationService.syncBoardAccessories(board.id);
    const checkedAcc = await prisma.item.findUnique({ where: { id: accToExclude.id } });
    if (Number(checkedAcc?.quantity) === 0 && checkedAcc?.isSystemManaged === false) {
        console.log('[PASS] Manual quantity = 0 preference preserved by automation.');
    } else {
        console.error(`[FAIL] Automation overwrote manual quantity: ${JSON.stringify(checkedAcc)}`);
    }

    console.log('--- Verification Complete ---');
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
