import { PrismaClient } from '@prisma/client';
// Import prisma from the app to use the extended client
import prisma from '../lib/prisma';

async function main() {
    console.log('--- CLEAT SAFEGUARD REGRESSION TEST ---');

    const testBoardId = 'test-board-cleat-safeguard';
    
    try {
        // 0. Setup: Ensure test quote and board exist
        const testQuoteId = 'test-quote-safeguard';
        await prisma.quote.upsert({
            where: { id: testQuoteId },
            create: { id: testQuoteId, quoteNumber: 'TEST-Q-001', status: 'DRAFT' },
            update: {}
        });

        await prisma.board.upsert({
            where: { id: testBoardId },
            create: { id: testBoardId, quoteId: testQuoteId, name: 'Test Board' },
            update: {}
        });

        // 1. Database Gate Test: CREATE
        console.log('Test 1: CREATE cleat with isSystemManaged: true');
        const newItem = await prisma.item.create({
            data: {
                boardId: testBoardId,
                category: 'Busbar Supports',
                name: 'TEST-CLEAT-1',
                description: 'Test Cleat',
                isSystemManaged: true,
                isDefault: true,
                quantity: 5,
                unitPrice: 10,
                cost: 50
            }
        });

        console.log(` - Created Item ID: ${newItem.id}`);
        console.log(` - isSystemManaged: ${newItem.isSystemManaged} (Expected: false)`);
        console.log(` - isDefault: ${newItem.isDefault} (Expected: false)`);

        if (newItem.isSystemManaged || newItem.isDefault) {
            throw new Error('FAILED: Database Gate did not intercept CREATE');
        }
        console.log('PASSED: CREATE intercepted');

        // 2. Database Gate Test: UPDATE
        console.log('Test 2: UPDATE cleat back to isSystemManaged: true');
        const updatedItem = await prisma.item.update({
            where: { id: newItem.id },
            data: {
                isSystemManaged: true,
                isDefault: true,
                quantity: 10
            }
        });

        console.log(` - Updated Item ID: ${updatedItem.id}`);
        console.log(` - isSystemManaged: ${updatedItem.isSystemManaged} (Expected: false)`);
        console.log(` - isDefault: ${updatedItem.isDefault} (Expected: false)`);
        console.log(` - quantity: ${Number(updatedItem.quantity)} (Expected: 10)`);

        if (updatedItem.isSystemManaged || updatedItem.isDefault) {
            throw new Error('FAILED: Database Gate did not intercept UPDATE');
        }
        console.log('PASSED: UPDATE intercepted');

        // 3. Cleanup
        await prisma.item.delete({ where: { id: newItem.id } });
        console.log('Cleanup: Test item deleted.');

    } catch (e) {
        console.error('REGRESSION TEST FAILED:');
        console.error(e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }

    console.log('--- ALL SAFEGUARD TESTS PASSED ---');
}

main();
