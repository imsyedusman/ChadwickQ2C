import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.catalogItem.count({
        where: {
            OR: [
                { category: 'Switchboard' },
                { brand: 'Schneider Electric' }
            ]
        }
    });

    console.log(`Total items in Switchboard/Schneider: ${count}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
