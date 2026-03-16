import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching quotes...');
    const quotes = await prisma.quote.findMany({
        select: {
            id: true,
            quoteNumber: true,
            revision: true,
            revisionGroupId: true,
            status: true
        },
        take: 10
    });
    console.log('Quotes found:', JSON.stringify(quotes, null, 2));
    
    const count = await prisma.quote.count();
    console.log('Total quotes count:', count);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
