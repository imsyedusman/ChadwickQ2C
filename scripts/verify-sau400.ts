
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying SAU400 Automation ---');

    // 1. Check Rule Mappings
    const rule = await prisma.pairingRule.findUnique({
        where: {
            ruleType_inputPartNumber: {
                ruleType: 'MCB_CHASSIS_TO_NE_LINK_165A',
                inputPartNumber: 'SAU40012183' // The specific one user mentioned
            }
        }
    });

    if (!rule) {
        console.error('FAILED: Rule for SAU40012183 NOT FOUND.');
        return;
    }
    console.log(`PASSED: Rule found: ${rule.inputPartNumber} -> ${rule.outputPartNumber}`);

    // 2. Setup Board & Catalog
    const board = await prisma.board.create({
        data: {
            quote: { create: { quoteNumber: `SAU400-TEST-${Date.now()}`, status: 'DRAFT', settingsSnapshot: '{}' } },
            name: 'SAU400 Test Board',
            type: 'MSB',
            config: '{}'
        }
    });

    // Ensure link catalog item
    const existing = await prisma.catalogItem.findFirst({ where: { partNumber: 'enb12' } });
    if (!existing) {
        await prisma.catalogItem.create({
            data: {
                partNumber: 'enb12',
                description: 'Link',
                unitPrice: 10,
                category: 'Switchboard',
                subcategory: 'Neutral and Earth Links - 165A'
            }
        });
    }

    const boardId = board.id;
    const { AutomationService } = await import('../lib/automation');

    console.log('--- TEST 1: Add SAU40012183 (Qty 4) ---');
    // Simulate what API does (create then automation)
    await prisma.item.create({
        data: {
            boardId,
            category: 'Other', // Intentional bad category to prove partNumber scoping works
            name: 'A9 Chassis',
            partNumber: 'SAU40012183',
            quantity: 4,
            unitPrice: 100,
            cost: 400,
            description: 'SAU 400A',
            isSystemManaged: false
        }
    });

    // Run Automation
    await AutomationService.applyPairingRules(boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');

    const links = await prisma.item.findMany({
        where: { boardId, systemTag: 'MCB_CHASSIS_LINK' }
    });

    if (links.length === 1 && links[0].partNumber === 'enb12' && links[0].quantity === 4) {
        console.log('PASSED: enb12 created with qty 4');
    } else {
        console.error('FAILED: Link creation mismatch.');
        console.log(links);
    }

    console.log('--- TEST 2: Delete Chassis ---');
    await prisma.item.deleteMany({ where: { boardId, partNumber: { startsWith: 'SAU' } } });

    await AutomationService.applyPairingRules(boardId, 'MCB_CHASSIS_TO_NE_LINK_165A');

    const remaining = await prisma.item.findMany({ where: { boardId, systemTag: 'MCB_CHASSIS_LINK' } });

    if (remaining.length === 0) {
        console.log('PASSED: Link removed.');
    } else {
        console.error('FAILED: Link not removed.');
        console.log(remaining);
    }
}

main().finally(() => prisma.$disconnect());
