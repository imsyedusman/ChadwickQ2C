
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAutoAdd() {
    const item = await prisma.catalogItem.findFirst({
        where: { partNumber: 'MISC-DELIVERY-HIAB' }
    });
    console.log('MISC-DELIVERY-HIAB:', item);

    const ute = await prisma.catalogItem.findFirst({
        where: { partNumber: 'MISC-DELIVERY-UTE' }
    });
    console.log('MISC-DELIVERY-UTE:', ute);
}

checkAutoAdd()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
