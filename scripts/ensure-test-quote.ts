
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const quote = await prisma.quote.findFirst();
    if (!quote) {
        await prisma.quote.create({
            data: {
                quoteNumber: 'Q26-9999',
                clientName: 'Test Customer',
                status: 'DRAFT',
            }
        });
        console.log('Created test quote Q26-9999');
    } else {
        console.log(`Using existing quote: ${quote.quoteNumber}`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
