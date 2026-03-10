import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkQuotes() {
    const quotes = await prisma.quote.findMany({
        select: {
            id: true,
            quoteNumber: true,
            revision: true,
            projectRef: true,
            updatedAt: true
        },
        orderBy: [
            { quoteNumber: 'asc' },
            { revision: 'asc' }
        ]
    });

    console.log('--- DATABASE QUOTE AUDIT ---');
    console.log(`Total records: ${quotes.length}`);

    const groups: Record<string, any[]> = {};
    quotes.forEach(q => {
        if (!groups[q.quoteNumber]) groups[q.quoteNumber] = [];
        groups[q.quoteNumber].push(q);
    });

    Object.entries(groups).forEach(([num, revs]) => {
        console.log(`\nQuote: ${num}`);
        revs.forEach(r => {
            console.log(`  - ID: ${r.id} | Rev: ${r.revision} | Ref: ${r.projectRef} | Updated: ${r.updatedAt.toISOString()}`);
        });
    });
}

checkQuotes().catch(console.error).finally(() => prisma.$disconnect());
