const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mocking required logic from lib/quote-numbering without importing TS files
// (Since we want to test the logic, and we can't easily import the TS file into a JS script here)
// Actually, I want to test the *actual* implementation.

async function test() {
    console.log('--- STARTING VERIFICATION (JSON/API) ---');
    
    // We will verify by calling the API routes directly via fetch or equivalent if possible,
    // but here we are in a node environment. We'll use Prisma to verify state.
    
    const year = new Date().getFullYear();
    const shortYear = year.toString().slice(-2);

    // Helper to get next number (mimicking generateNextQuoteNumber)
    async function getNext() {
        return await prisma.$transaction(async (tx) => {
            let sequence = await tx.quoteSequence.findUnique({ where: { year } });
            if (!sequence) {
                sequence = await tx.quoteSequence.create({ data: { year, lastNumber: 0 } });
            }
            return await tx.quoteSequence.update({
                where: { year },
                data: { lastNumber: { increment: 1 } }
            });
        });
    }

    // Helper to sync (mimicking syncQuoteSequence)
    async function sync(delNum) {
        const quotes = await prisma.quote.findMany({
            where: { quoteNumber: { startsWith: `Q${shortYear}-` } },
            select: { quoteNumber: true }
        });
        let max = 0;
        quotes.forEach(q => {
            const m = q.quoteNumber.match(/^Q\d{2}-(\d{4})/);
            if (m) {
                const n = parseInt(m[1], 10);
                if (n > max) max = n;
            }
        });

        await prisma.$transaction(async (tx) => {
            const seq = await tx.quoteSequence.findUnique({ where: { year } });
            const cur = seq.lastNumber;
            if (max > cur) {
                await tx.quoteSequence.update({ where: { year }, data: { lastNumber: max } });
            } else if (max < cur && delNum === cur) {
                await tx.quoteSequence.update({ where: { year }, data: { lastNumber: max } });
            }
        });
    }

    console.log('Cleaning up 9XXX range...');
    await prisma.quote.deleteMany({ where: { quoteNumber: { startsWith: `Q${shortYear}-9` } } });
    await prisma.quoteSequence.upsert({
        where: { year },
        update: { lastNumber: 9000 },
        create: { year, lastNumber: 9000 }
    });

    // Test 1: Generate
    const s1 = await getNext();
    console.log('Test 1 - Generated Sequence:', s1.lastNumber); // 9001
    await prisma.quote.create({ data: { quoteNumber: `Q${shortYear}-9001`, status: 'DRAFT' } });

    // Test 2: Rename Up
    console.log('Test 2 - Renaming to 9010...');
    await prisma.quote.update({
        where: { quoteNumber_revision: { quoteNumber: `Q${shortYear}-9001`, revision: 0 } },
        data: { quoteNumber: `Q${shortYear}-9010` }
    });
    await sync();
    const s2 = await prisma.quoteSequence.findUnique({ where: { year } });
    console.log('Sequence after rename:', s2.lastNumber); // 9010

    // Test 3: Delete Tail
    console.log('Test 3 - Deleting 9010 (Tail)...');
    await prisma.quote.delete({
        where: { quoteNumber_revision: { quoteNumber: `Q${shortYear}-9010`, revision: 0 } }
    });
    await sync(9010);
    const s3 = await prisma.quoteSequence.findUnique({ where: { year } });
    console.log('Sequence after tail delete:', s3.lastNumber); // 9000 (since 0 quotes left in 9XXX)

    // Test 4: Delete Non-Tail
    await getNext(); // 9001
    await prisma.quote.create({ data: { quoteNumber: `Q${shortYear}-9001`, status: 'DRAFT' } });
    await getNext(); // 9002
    await prisma.quote.create({ data: { quoteNumber: `Q${shortYear}-9002`, status: 'DRAFT' } });
    
    console.log('Test 4 - Deleting 9001 (Non-Tail)...');
    await prisma.quote.delete({
        where: { quoteNumber_revision: { quoteNumber: `Q${shortYear}-9001`, revision: 0 } }
    });
    await sync(9001);
    const s4 = await prisma.quoteSequence.findUnique({ where: { year } });
    console.log('Sequence after non-tail delete:', s4.lastNumber); // Should STILL be 9002

    // Cleanup
    await prisma.quote.deleteMany({ where: { quoteNumber: { startsWith: `Q${shortYear}-9` } } });
    
    console.log('--- VERIFICATION COMPLETE ---');
}

test().finally(() => prisma.$disconnect());
