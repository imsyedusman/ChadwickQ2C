
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- ENB Items ---');
    const items = await prisma.catalogItem.findMany({
        where: { partNumber: { startsWith: 'ENB' } },
        select: { partNumber: true, description: true }
    });
    items.forEach(i => console.log(`${i.partNumber}: ${i.description}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
