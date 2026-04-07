const { PrismaClient } = require('@prisma/client');
const { syncBoardItems } = require('../lib/board-item-service');

const prisma = new PrismaClient();

async function verifyFix() {
    // 1. Find a custom board
    const board = await prisma.board.findFirst({
        where: { config: { contains: 'Custom' } },
        include: { items: true }
    });

    if (!board) {
        console.log('No custom board found to test');
        return;
    }

    console.log(`--- Testing with Board ID: ${board.id} ---`);

    const tierCounts = [1, 3, 7];

    for (const count of tierCounts) {
        console.log(`\nTesting with ${count} Tiers...`);
        
        const config = JSON.parse(board.config || '{}');
        config.tierCount = count;
        config.enclosureType = 'Custom';
        config.enclosureDepth = '400';

        await syncBoardItems(board.id, config, { forceTiers: true });

        const updatedItems = await prisma.item.findMany({
            where: { boardId: board.id, name: '1B-TIERS-400' }
        });

        const tierItem = updatedItems[0];
        if (tierItem) {
            const qty = Number(tierItem.quantity);
            const unitLabor = Number(tierItem.labourHours);
            const totalLabor = qty * unitLabor;

            console.log(`Item: ${tierItem.name}`);
            console.log(`Quantity: ${qty} (Expected: ${count})`);
            console.log(`Unit Labor: ${unitLabor} (Expected: 1)`);
            console.log(`Total Labor: ${totalLabor} (Expected: ${count})`);

            if (qty === count && unitLabor === 1 && totalLabor === count) {
                console.log(`[PASS] Scaling correct for ${count} tiers`);
            } else {
                console.log(`[FAIL] Scaling incorrect for ${count} tiers`);
            }
        } else {
            console.log('[FAIL] 1B-TIERS-400 item not found');
        }
    }

    // Regression Check: Cubic
    console.log('\n--- Regression Check: Cubic ---');
    const cubicConfig = { enclosureType: 'Cubic', tierCount: 7 };
    await syncBoardItems(board.id, cubicConfig, { forceTiers: true });

    const cubicItems = await prisma.item.findMany({
        where: { boardId: board.id, name: '1A-TIERS' }
    });

    const cubicTierItem = cubicItems[0];
    if (cubicTierItem) {
        const qty = Number(cubicTierItem.quantity);
        const unitLabor = Number(cubicTierItem.labourHours);
        const totalLabor = qty * unitLabor;

        console.log(`Item: ${cubicTierItem.name}`);
        console.log(`Quantity: ${qty} (Expected: 7)`);
        console.log(`Unit Labor: ${unitLabor} (Expected: 6)`); 
        console.log(`Total Labor: ${totalLabor} (Expected: 42)`);

        if (qty === 7 && unitLabor === 6 && totalLabor === 42) {
            console.log('[PASS] Cubic logic remains untouched');
        } else {
            console.log('[FAIL] Cubic logic affected');
        }
    }

    await prisma.$disconnect();
}

verifyFix().catch(console.error);
