const { syncBoardItems } = require('../lib/board-item-service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTierLabour() {
    // 1. Find a board to test with (or create one)
    const board = await prisma.board.findFirst({
        where: { config: { contains: '"enclosureType": "Custom"' } },
        include: { items: true }
    });

    if (!board) {
        console.log('No custom board found to test');
        return;
    }

    console.log(`Testing with Board ID: ${board.id}`);
    
    // 2. Sync with 7 tiers
    const config = JSON.parse(board.config || '{}');
    config.tierCount = 7;
    config.enclosureType = 'Custom';
    config.enclosureDepth = '400';

    console.log('Syncing with 7 tiers...');
    await syncBoardItems(board.id, config, { forceTiers: true });

    // 3. Check the item
    const updatedBoard = await prisma.board.findUnique({
        where: { id: board.id },
        include: { items: true }
    });

    const tierItem = updatedBoard.items.find(i => i.name === '1B-TIERS-400');
    if (tierItem) {
        console.log(`\nItem: ${tierItem.name}`);
        console.log(`Quantity: ${tierItem.quantity}`);
        console.log(`Unit Price: ${tierItem.unitPrice}`);
        console.log(`Unit Labour: ${tierItem.labourHours}`);
        console.log(`Total Labour: ${Number(tierItem.quantity) * Number(tierItem.labourHours)}`);
    } else {
        console.log('1B-TIERS-400 not found after sync');
    }

    await prisma.$disconnect();
}

testTierLabour().catch(console.error);
