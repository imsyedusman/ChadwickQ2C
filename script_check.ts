import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.quote.count();
        console.log(`CURRENT_QUOTE_COUNT: ${count}`);
    } catch (e) {
        console.error("Error querying quotes:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
