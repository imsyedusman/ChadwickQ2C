import prisma from '../lib/prisma';
import { syncBoardItems } from '../lib/board-item-service';

async function main() {
    console.log("--- Starting Meter Automation Verification (TS) ---");

    // Try to find a recently created board or create a test one
    let board = await prisma.board.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!board) {
        console.error("No board found.");
        return;
    }

    console.log(`Testing on Board: ${board.name} (${board.id})`);

    // Cleanup
    await prisma.item.deleteMany({
        where: { boardId: board.id, systemTag: 'DIGITAL_METER' }
    });
    
    // Ensure we have a meter
    const existingMeter = await prisma.item.findFirst({
        where: { boardId: board.id, partNumber: 'A9MEM2105' }
    });

    if (!existingMeter) {
        console.log("Adding 1x A9MEM2105");
        await prisma.item.create({
            data: {
                boardId: board.id,
                name: 'A9MEM2105',
                partNumber: 'A9MEM2105',
                description: 'Digital Meter',
                quantity: 1,
                unitPrice: 500,
                cost: 500,
                category: 'Switchboard',
                subcategory: 'Metering'
            }
        });
    } else {
        console.log(`Updating ${existingMeter.partNumber} quantity to 1`);
        await prisma.item.update({
            where: { id: existingMeter.id },
            data: { quantity: 1 }
        });
    }

    console.log("Running Sync...");
    await syncBoardItems(board.id, JSON.parse(board.config || '{}') as any);

    const accessories = await prisma.item.findMany({
        where: { boardId: board.id, systemTag: 'DIGITAL_METER' }
    });

    console.log("\nResults for Qty 1:");
    accessories.forEach(a => {
        console.log(`- ${a.partNumber}: ${a.quantity} (Price: ${a.unitPrice})`);
    });

    // Test with Qty 2
    console.log("\nScenario 2: Updating to 2x A9MEM2105");
    const meter = await prisma.item.findFirst({
        where: { boardId: board.id, partNumber: 'A9MEM2105' }
    });
    if (meter) {
        await prisma.item.update({
            where: { id: meter.id },
            data: { quantity: 2 }
        });
    }

    console.log("Running Sync...");
    await syncBoardItems(board.id, JSON.parse(board.config || '{}') as any);

    const accessories2 = await prisma.item.findMany({
        where: { boardId: board.id, systemTag: 'DIGITAL_METER' }
    });

    console.log("\nResults for Qty 2:");
    accessories2.forEach(a => {
        console.log(`- ${a.partNumber}: ${a.quantity} (Price: ${a.unitPrice})`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
