import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findBoard() {
    const board = await prisma.board.findFirst({
        where: { config: { contains: 'Custom' } },
        select: { id: true, config: true }
    });
    console.log(JSON.stringify(board));
    await prisma.$disconnect();
}

findBoard().catch(console.error);
