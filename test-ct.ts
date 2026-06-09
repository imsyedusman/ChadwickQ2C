import { syncBoardItems } from './lib/board-item-service';
import prisma from './lib/prisma';
async function run() {
  const b = await prisma.board.findFirst({orderBy: {updatedAt: 'desc'}});
  await syncBoardItems(b.id, JSON.parse(b.config));
  const b2 = await prisma.board.findFirst({where: {id: b.id}, include: {items: true}});
  console.log(b2.items.map(i => i.name));
}
run().catch(console.error);
