import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const items = await prisma.catalogItem.findMany({
        where: {
            partNumber: 'RM17TG00'
        }
    });

    console.log('Records for RM17TG00:', JSON.stringify(items, null, 2));
    
    await prisma.$disconnect();
}

check();
