import { syncBoardItems } from './lib/board-item-service';
import prisma from './lib/prisma';
async function run() {
  const b = await prisma.board.findFirst({orderBy: {updatedAt: 'desc'}});
  const config = JSON.parse(b.config);
  config.ctMetering = 'No';
  config.wholeCurrentMetering = 'Yes';
  await prisma.board.update({where: {id: b.id}, data: {config: JSON.stringify(config)}});
  await syncBoardItems(b.id, config);
  const b2 = await prisma.board.findFirst({where: {id: b.id}, include: {items: true}});
  console.log('Items:', b2.items.map(i => i.name));
}
run().catch(console.error);
