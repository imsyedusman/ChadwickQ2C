
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('Starting MCB Automation Verification (User Scenario: SAU400 + SAU250 -> enb12)...');

    // 1. Setup Data - Ensure Catalog Item for enb12 exists
    const CATALOG_ENB12 = {
        partNumber: 'enb12',
        description: 'Neutral/Earth Link 12 Way',
        unitPrice: 45,
        category: 'Switchgears',
        subcategory: 'Circuit Breakers > MCB Accessories > Neutral and Earth Links - 165A',
        isSheetmetal: false
    };

    const existingCatalog = await prisma.catalogItem.findFirst({ where: { partNumber: 'enb12' } });
    if (!existingCatalog) {
        await prisma.catalogItem.create({ data: CATALOG_ENB12 });
        console.log('Created Catalog Item: enb12');
    } else {
        // Ensure category matches user expectation for test
        await prisma.catalogItem.update({
            where: { id: existingCatalog.id },
            data: {
                category: CATALOG_ENB12.category,
                subcategory: CATALOG_ENB12.subcategory
            }
        });
        console.log('Updated Catalog Item: enb12 (Category Sync)');
    }

    // 2. Create Board
    const board = await prisma.board.create({
        data: {
            quote: {
                create: {
                    quoteNumber: `VERIFY-SCENARIO-${Date.now()}`,
                    status: 'DRAFT',
                    settingsSnapshot: '{}'
                }
            },
            name: 'MCB Scenario Board',
            type: 'MSB',
            config: '{}'
        }
    });

    try {
        const boardId = board.id;
        const { AutomationService } = await import('../lib/automation');

        // 3. User Scenario: Add items manualy
        // Add SAU40012183 qty 4
        // Add SAU25012183 qty 1

        console.log('--- TEST: Adding Chassis Items ---');

        await prisma.item.create({
            data: {
                boardId,
                category: 'Switchboard', // As per screenshot usually
                name: 'SAU40012183',
                partNumber: 'SAU40012183',
                quantity: 4,
                unitPrice: 200,
                cost: 800,
                description: 'Test Chassis 400',
                isSystemManaged: false
            }
        });

        await prisma.item.create({
            data: {
                boardId,
                category: 'Switchboard',
                name: 'SAU25012183',
                partNumber: 'SAU25012183',
                quantity: 1,
                unitPrice: 100,
                cost: 100,
                description: 'Test Chassis 250',
                isSystemManaged: false
            }
        });

        // Run Automation
        console.log('Running Automation...');
        const { warnings } = await AutomationService.applyPairingRules(boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');

        if (warnings.length > 0) {
            console.warn('Warnings:', warnings);
        }

        // Verify Results
        const links = await prisma.item.findMany({
            where: { boardId, systemTag: 'MCB_CHASSIS_LINK' }
        });

        console.log(`System Links Found: ${links.length}`);

        if (links.length !== 1) {
            console.error('FAILED: Expected exactly 1 link item.');
            console.log(JSON.stringify(links, null, 2));
        } else {
            const link = links[0];
            console.log('Link Item:', link.partNumber, 'Qty:', link.quantity);

            // Checks
            let passed = true;
            if (link.partNumber !== 'enb12') {
                console.error('FAILED: PartNumber mismatch. Expected enb12');
                passed = false;
            }
            if (link.quantity !== 5) {
                console.error('FAILED: Quantity mismatch. Expected 5 (4+1)');
                passed = false;
            }
            if (link.subcategory !== CATALOG_ENB12.subcategory) {
                console.error(`FAILED: Subcategory mismatch. Expected '${CATALOG_ENB12.subcategory}', got '${link.subcategory}'`);
                passed = false;
            }

            if (passed) {
                console.log('✅ PASSED: Creation verification successful.');
            }
        }

        // 4. Test Cleanup
        console.log('--- TEST: Removing All Chassis ---');
        await prisma.item.deleteMany({ where: { boardId, isSystemManaged: false } });

        await AutomationService.applyPairingRules(boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');

        const remaining = await prisma.item.findMany({
            where: { boardId, systemTag: 'MCB_CHASSIS_LINK' }
        });

        if (remaining.length === 0) {
            console.log('✅ PASSED: Cleanup verification successful.');
        } else {
            console.error('FAILED: Items not removed.');
        }

    } catch (e) {
        console.error('Verification Failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
