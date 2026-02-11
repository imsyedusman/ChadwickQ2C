
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking for 400A 30P Variants ---');
    const items = await prisma.catalogItem.findMany({
        where: {
            partNumber: { contains: 'SAU400' }
        },
        select: { partNumber: true, description: true }
    });

    const variants30P = items.filter(i =>
        (i.partNumber && i.partNumber.includes('30')) ||
        (i.description && i.description.includes('30P'))
    );

    if (variants30P.length > 0) {
        console.log(`Found ${variants30P.length} variants:`);
        variants30P.forEach(v => console.log(`${v.partNumber}: ${v.description}`));
    } else {
        console.log('No 400A 30P variants found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
