const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FUSE_SKU = 'CHD-FUSE-20A-DIN';

async function simulate() {
    console.log("--- Starting Lifecycle Simulation (v4) ---");
    const board = await prisma.board.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!board) {
        console.error("No board found.");
        return;
    }
    const boardId = board.id;

    // 1. Cleanup all managed items to avoid unique constraint violations
    console.log("Cleaning up board managed items...");
    await prisma.item.deleteMany({ 
        where: { 
            boardId, 
            isSystemManaged: true
        } 
    });

    // 2. SIMULATE DIGITAL METER AUTOMATION OUTPUT
    console.log("\nStep 2: Simulating Digital Meter Automation Output...");
    
    const unitPrice = 3.7;

    const dmFuse = await prisma.item.create({
        data: {
            boardId,
            category: 'Switchboard',
            subcategory: 'Control',
            name: FUSE_SKU,
            partNumber: FUSE_SKU,
            quantity: 3,
            unitPrice: unitPrice,
            cost: unitPrice * 3,
            isSystemManaged: true,
            systemTag: 'DIGITAL_METER', // THE IMPORTANT TAG
            systemRuleType: 'DIGITAL_METER_AUTOMATION',
            notes: 'System Managed'
        }
    });
    console.log(`Created fuse (ID: ${dmFuse.id}) with systemTag: DIGITAL_METER`);

    // 3. SIMULATE GC AUTOMATION (New Strict Version)
    console.log("\nStep 3: Running Simulated GC Logic (Strict Mode)...");
    const SYSTEM_TAG_GC = 'GENERAL_CONTROL';
    
    // Re-fetch all items
    const itemsOnBoard = await prisma.item.findMany({ where: { boardId } });
    
    // The new logic: filter strictly by GENERAL_CONTROL tag
    console.log(`Scanning ${itemsOnBoard.length} items for tag: ${SYSTEM_TAG_GC}`);
    const gcSystemItems = itemsOnBoard.filter(i => 
        i.isSystemManaged && i.systemTag === SYSTEM_TAG_GC
    );
    console.log(`GC found ${gcSystemItems.length} items to manage.`);
    
    // GC Requirements for this test = 0
    const gcReqs = new Map(); 
    
    // Cleanup orphans in GC phase
    console.log("GC Cleanup phase...");
    let deletedCount = 0;
    for (const item of gcSystemItems) {
        if (!gcReqs.has(item.partNumber)) {
            console.log(`GC deleting orphaned item: ${item.partNumber}`);
            await prisma.item.delete({ where: { id: item.id } });
            deletedCount++;
        }
    }
    console.log(`GC deleted ${deletedCount} items.`);

    // 4. FINAL VERIFICATION
    console.log("\nStep 4: Final Verification...");
    const finalItems = await prisma.item.findMany({ where: { boardId } });
    const preservedFuse = finalItems.find(i => i.id === dmFuse.id);
    
    if (preservedFuse) {
        console.log(`\n✅ SUCCESS: Digital Meter Fuse preserved! (Qty: ${preservedFuse.quantity}, Tag: ${preservedFuse.systemTag})`);
    } else {
        console.log("\n❌ FAILURE: Digital Meter Fuse was deleted!");
    }
}

simulate().catch(console.error).finally(() => prisma.$disconnect());
