import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const b = await prisma.board.findUnique({ where: { id: '1c514a14-a5b0-4ea7-91e0-2a467eaae561' } });
    console.log(JSON.stringify(b, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
