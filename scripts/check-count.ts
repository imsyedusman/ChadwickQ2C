import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.catalogItem.count().then(c => {
    console.log('Total catalog items:', c);
}).finally(() => prisma.$disconnect());
