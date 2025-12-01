import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const busbars = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { category: 'Busbar' },
                { description: { contains: 'Busbar 3000A' } }
            ]
        },
        take: 10
    });

    console.log('Found items:', JSON.stringify(busbars, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
