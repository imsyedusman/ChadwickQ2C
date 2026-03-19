import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Check: Unique Brands ---');
    
    const brands = await (prisma as any).catalogItem.groupBy({
        by: ['brand'],
        _count: { id: true }
    });

    console.log('Brands found:');
    console.table(brands);

    // Also check partNumber formats
    const randomItems = await (prisma as any).catalogItem.findMany({
        take: 20
    });
    console.log('\nSample items:');
    randomItems.forEach((i: any) => {
        console.log(`[${i.brand}] ${i.partNumber} - ${i.category}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
