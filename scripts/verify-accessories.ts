import { PrismaClient } from '@prisma/client';
// import { AutomationService } from '../lib/automation'; // AutomationService might need import too, but let's check path.
// It was require('../lib/automation').
import { AutomationService } from '../lib/automation';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Accessory Automation Scenarios ---');

    // 1. Get a board
    const quote = await prisma.quote.findFirst({ include: { boards: true } });
    if (!quote || !quote.boards[0]) {
        console.error('No quotes/boards found.');
        return;
    }
    const boardId = quote.boards[0].id;
    console.log(`Using Board: ${boardId}`);

    // Clean start
    await prisma.item.deleteMany({ where: { boardId, productFrame: { not: null } } });
    await prisma.item.deleteMany({ where: { boardId, isSystemManaged: true } });
    console.log('Cleaned board.');

    // ---------------------------------------------------------
    // Scenario B: Multi-kA Breaker Aggregation
    // ---------------------------------------------------------
    console.log('\n--- Scenario B: Multi-kA Aggregation ---');
    console.log('Adding NSX100 25kA, NSX160 36kA, NSX250 50kA (All same Frame)');

    // Create items with same productFrame but "different kA" (simulated via name/desc/price)
    const frame = 'NSX100-250';
    await prisma.item.createMany({
        data: [
            { boardId, name: 'NSX100-25kA', productFrame: frame, quantity: 1, category: 'Switchboard', unitPrice: 100 },
            { boardId, name: 'NSX160-36kA', productFrame: frame, quantity: 1, category: 'Switchboard', unitPrice: 100 },
            { boardId, name: 'NSX250-50kA', productFrame: frame, quantity: 1, category: 'Switchboard', unitPrice: 100 }
        ]
    });

    await AutomationService.syncBoardAccessories(boardId);

    const bAccessories = await prisma.item.findMany({ where: { boardId, isSystemManaged: true } });
    console.log('Accessories (Expect 1 Handle line, 1 Shield line):');
    bAccessories.forEach(a => console.log(`- ${a.name} (Qty: ${a.quantity}) Frame: ${a.productFrame}`));

    const handle = bAccessories.find(a => a.name === 'LV429338T');
    const shield = bAccessories.find(a => a.name === 'LV429517');

    if (handle?.quantity !== 3 || shield?.quantity !== 6) {
        console.error('FAIL: Multi-kA aggregation incorrect.');
    } else {
        console.log('PASS: Aggregation correct.');
    }

    // ---------------------------------------------------------
    // Scenario C: Mixed Frames
    // ---------------------------------------------------------
    console.log('\n--- Scenario C: Mixed Frames ---');
    console.log('Adding NSX400 (Frame 400-630)');

    await prisma.item.create({
        data: { boardId, name: 'NSX400-36kA', productFrame: 'NSX400-630', quantity: 2, category: 'Switchboard', unitPrice: 500 }
    });

    await AutomationService.syncBoardAccessories(boardId);

    const cAccessories = await prisma.item.findMany({ where: { boardId, isSystemManaged: true } });
    console.log('Accessories (Expect 2 sets):');
    cAccessories.forEach(a => console.log(`- ${a.name} (Qty: ${a.quantity}) Frame: ${a.productFrame}`));

    const handle400 = cAccessories.find(a => a.name === 'LV432598T');
    if (handle400?.quantity !== 2) {
        console.error('FAIL: Mixed frame logic incorrect.');
    } else {
        console.log('PASS: Mixed frames handled correctly.');
    }

    // ---------------------------------------------------------
    // Scenario 1: Qty Stability (Recursion Check)
    // ---------------------------------------------------------
    console.log('\n--- Scenario 1: Stability Check ---');
    console.log('Adding 1 NSX100 (qty=2)...');
    const b1 = await prisma.item.create({
        data: { boardId, name: 'NSX100-Stability', productFrame: 'NSX100-250', quantity: 2, category: 'Switchboard', unitPrice: 100 }
    });

    await AutomationService.syncBoardAccessories(boardId);
    let sAcc = await prisma.item.findMany({ where: { boardId, isSystemManaged: true, productFrame: 'NSX100-250' } });
    let sShield = sAcc.find(a => a.name === 'LV429517');
    console.log(`Initial: Breaker Qty=2 -> Shield Qty=${sShield?.quantity} (Expect 4)`);

    if (sShield?.quantity !== 4) console.error('FAIL: Initial calculation wrong');

    // Run sync AGAIN without changes. Should not increase.
    await AutomationService.syncBoardAccessories(boardId);
    sAcc = await prisma.item.findMany({ where: { boardId, isSystemManaged: true, productFrame: 'NSX100-250' } });
    sShield = sAcc.find(a => a.name === 'LV429517');
    console.log(`Re-run: Breaker Qty=2 -> Shield Qty=${sShield?.quantity} (Expect 4)`);

    if (sShield?.quantity !== 4) console.error('FAIL: Re-run increased quantity (Runaway loop!)');

    // Decrease Breaker
    console.log('Decreasing Breaker Qty to 1...');
    await prisma.item.update({ where: { id: b1.id }, data: { quantity: 1 } });
    await AutomationService.syncBoardAccessories(boardId);

    sAcc = await prisma.item.findMany({ where: { boardId, isSystemManaged: true, productFrame: 'NSX100-250' } });
    sShield = sAcc.find(a => a.name === 'LV429517');
    console.log(`Decrease: Breaker Qty=1 -> Shield Qty=${sShield?.quantity} (Expect 2)`);

    if (sShield?.quantity !== 2) console.error('FAIL: Decrease failed to update accessories');
    else console.log('PASS: Stability confirmed.');


    // ---------------------------------------------------------
    // Scenario A: Delete Cleanup
    // ---------------------------------------------------------
    console.log('\n--- Scenario A: Delete Cleanup ---');
    console.log('Deleting all NSX100-250 breakers...');

    await prisma.item.deleteMany({ where: { boardId, productFrame: 'NSX100-250' } });

    // Manually trigger sync (since we bypassed API)
    await AutomationService.syncBoardAccessories(boardId);

    const aAccessories = await prisma.item.findMany({ where: { boardId, isSystemManaged: true } });
    console.log('Accessories remaining:');
    aAccessories.forEach(a => console.log(`- ${a.name} (Qty: ${a.quantity})`));

    if (aAccessories.length !== 2) { // Should only have NSX400 items left
        console.error('FAIL: Cleanup failed. Expected only NSX400 accessories.');
    } else {
        console.log('PASS: Cleanup correct. NSX100-250 accessories gone.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
export { };
