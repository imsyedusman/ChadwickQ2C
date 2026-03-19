import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkBusbars() {
    const items = await prisma.catalogItem.findMany({
        where: { category: 'Busbar' },
        select: {
            partNumber: true,
            description: true,
            isCopperPriced: true,
            totalCopperWeightKgPerMeter: true,
            labourHours: true
        },
        take: 20
    });
    console.log(JSON.stringify(items, null, 2));
}

checkBusbars().finally(() => prisma.$disconnect());
