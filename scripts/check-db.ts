import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const items = await prisma.catalogItem.findMany({
        where: {
            partNumber: {
                in: ['TRV00121', 'LV434128', 'EM27072DMV53X2SN', '48250500', '48250501']
            }
        },
        select: {
            partNumber: true,
            components: true
        }
    });

    console.log(JSON.stringify(items, null, 2));
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
