import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const bb = await prisma.catalogItem.findFirst({ where: { partNumber: 'BB-400A' } });
    console.log(JSON.stringify(bb, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
