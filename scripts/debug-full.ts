import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Settings...');
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    console.log('Global Settings:', settings);
    
    console.log('Checking first quote full data...');
    const quote = await (prisma as any).quote.findFirst({
        include: { boards: { include: { items: true } } }
    });
    console.log('Quote data:', JSON.stringify(quote, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
