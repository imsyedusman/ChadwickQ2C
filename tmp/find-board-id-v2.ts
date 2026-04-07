import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findBoard() {
    const board = await prisma.board.findFirst({
        where: { config: { contains: 'Custom' } },
        select: { id: true }
    });
    if (board) console.log(`ID_START[${board.id}]ID_END`);
    else console.log('NO_BOARD_FOUND');
    await prisma.$disconnect();
}

findBoard().catch(console.error);
