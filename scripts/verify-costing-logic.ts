
import { PrismaClient } from '@prisma/client';
import { syncBoardItems } from '../lib/board-item-service';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Verification for Costing Logic...');

    // 1. Setup: Ensure Catalog Items Exist
    // 1. Setup: Ensure Catalog Items Exist
    const catalogItems = [
        { partNumber: '1B-BASE', category: 'SWITCHBOARD', subcategory: 'Construction', description: 'Base' },
        { partNumber: '1B-SS-2B', category: 'SWITCHBOARD', subcategory: 'Construction', description: 'Stainless Uplift 2B' },
        { partNumber: '1B-SS-NO4', category: 'SWITCHBOARD', subcategory: 'Construction', description: 'Stainless Uplift No.4' },
        { partNumber: '1B-TIERS-400', category: 'SWITCHBOARD', subcategory: 'Tiers', description: 'Tier 400mm', unitPrice: 100 },
        { partNumber: '1B-DOORS', category: 'SWITCHBOARD', subcategory: 'Construction', description: 'Doors', unitPrice: 50 },
    ];

    // Clean up existing test items to avoid duplicates (since partNumber isn't unique in schema)
    for (const item of catalogItems) {
        if (item.partNumber) {
            await prisma.catalogItem.deleteMany({ where: { partNumber: item.partNumber } });
            await prisma.catalogItem.create({
                data: { ...item, unitPrice: item.unitPrice || 0 }
            });
        }
    }

    // 2. Create Test Quote & Board
    const quote = await prisma.quote.create({
        data: {
            quoteNumber: `TEST-COST-${Date.now()}`,
            description: 'Costing Verification', // used description instead of name
            status: 'Draft',
            clientName: 'Test Client',
        }
    });

    const board = await prisma.board.create({
        data: {
            quoteId: quote.id,
            name: 'Test Board',
            config: '{}', // Info only
            // Removed isMainBoard
        }
    });

    try {
        // --- TEST CASE 1: Base Cost ---
        console.log('\n--- Test Case 1: Base Cost (Custom, 2 Tiers, Base=Yes) ---');
        // Simulate config
        const config1 = {
            type: 'Main Switchboard',
            location: 'Indoor',
            enclosureType: 'Custom',
            material: 'Mild Steel',
            tierCount: 2,
            baseRequired: 'Yes',
            // ... required props
            ipRating: 'IP42', form: 'Form 4', faultRating: '50kA', currentRating: '630A',
            spd: 'No', ctMetering: 'No', meterPanel: 'No', wholeCurrentMetering: 'No', drawingRef: 'No', notes: '', name: 'Test Board'
        };

        await syncBoardItems(board.id, config1 as any);

        const items1 = await prisma.item.findMany({ where: { boardId: board.id } });
        const base = items1.find(i => i.name === 'Base'); // syncBoardItems copies CatalogItem.description to Item.name

        if (base) {
            console.log(`[PASS] Base Item found.`);
            // Formula: 200 + (2 * 200) = 600 total. Qty = 2. UnitPrice should be 300.
            if (base.quantity === 2 && base.unitPrice === 300) {
                console.log(`[PASS] Base Cost Correct: Qty 2, UnitPrice 300 (Total 600)`);
            } else {
                console.error(`[FAIL] Base Cost Mismatch: Qty ${base.quantity}, UnitPrice ${base.unitPrice}`);
            }
        } else {
            console.error(`[FAIL] Base Item NOT found.`);
        }


        // --- TEST CASE 2: Stainless Uplift (Powder 316) ---
        console.log('\n--- Test Case 2: Stainless Uplift (Powder 316) ---');

        // Update config
        const config2 = {
            ...config1,
            material: 'Powder 316 Stainless Steel',
            tierCount: 2
        };

        await syncBoardItems(board.id, config2 as any);

        const items2 = await prisma.item.findMany({ where: { boardId: board.id } });

        // Calculate expected S
        // Items contributing: 1B-TIERS-400, 1B-BASE.
        // 1B-TIERS-400 (Qty 2 * 100 = 200). Note: syncBoardItems adds Tiers based on Tier Count.
        // 1B-BASE (Qty 2 * 300 = 600)
        // S = 200 + 600 = 800.

        // Uplift Factor for Powder 316 = 0.65.
        // Expected Uplift Cost = 800 * 0.65 = 520.

        const ss2b = items2.find(i => i.name === 'Stainless Uplift 2B');

        if (ss2b) {
            console.log(`[PASS] Stainless Uplift 2B found.`);
            console.log(`Uplift Cost: ${ss2b.cost}, Expected: ~520`);

            if (Math.abs(ss2b.cost - 520) < 1) {
                console.log(`[PASS] Uplift Calculation Correct.`);
            } else {
                console.error(`[FAIL] Uplift Calculation Mismatch. Got ${ss2b.cost}, Expected 520.`);
                // Debug items
                items2.forEach(i => console.log(`Item: ${i.name}, Cost: ${i.cost}`));
            }
        } else {
            console.error(`[FAIL] Stainless Uplift 2B NOT found.`);
        }

        // --- TEST CASE 3: Cubic Base Restriction ---
        console.log('\n--- Test Case 3: Cubic Enclosure (No Base) ---');
        const config3 = {
            ...config1,
            enclosureType: 'Cubic',
            baseRequired: 'Yes' // Should be ignored for Cubic
        };

        await syncBoardItems(board.id, config3 as any);
        const items3 = await prisma.item.findMany({ where: { boardId: board.id } });
        const base3 = items3.find(i => i.name === 'Base');

        if (!base3) {
            console.log(`[PASS] Base Item correctly removed for Cubic.`);
        } else {
            console.error(`[FAIL] Base Item still present for Cubic!`);
        }

    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        // Cleanup
        await prisma.board.delete({ where: { id: board.id } });
        await prisma.quote.delete({ where: { id: quote.id } });
        await prisma.$disconnect();
    }
}

main();
