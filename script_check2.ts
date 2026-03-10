import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const quote = await prisma.quote.findFirst();
        console.log("SAMPLE_QUOTE:", quote);
    } catch (e) {
        console.error("Error querying sample quote:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
