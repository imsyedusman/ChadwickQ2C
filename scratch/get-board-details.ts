import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const boardId = 'dca32eaa-a25a-48ea-8ab4-f2b97a2f34b3';
  
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      items: true,
      quote: true
    }
  });

  if (!board) {
    console.log(`Board ${boardId} not found`);
    return;
  }

  console.log(JSON.stringify(board, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
