import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const quotes = await prisma.quote.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 2,
            include: {
                boards: true,
            }
        });
        console.log(`Successfully fetched ${quotes.length} quotes from dashboard query.`);
        console.log(`Latest quote revision: ${quotes[0]?.revision}`);
    } catch (e) {
        console.error("Dashboard query failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
