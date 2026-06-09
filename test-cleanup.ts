import { syncBoardItems } from './lib/board-item-service';
import prisma from './lib/prisma';
async function run() {
  const b = await prisma.board.findFirst();
  
  // 1. Set to 2500A
  const config = JSON.parse(b.config);
  config.enclosureType = 'Custom';
  config.currentRating = '2500A';
  config.ctMetering = 'No';
  await prisma.board.update({where: {id: b.id}, data: {config: JSON.stringify(config)}});
  await prisma.item.deleteMany({where: {boardId: b.id, name: {startsWith: 'BB'}}});

  console.log('--- SYNC 1: 2500A ---');
  await syncBoardItems(b.id, config);
  let b2 = await prisma.board.findFirst({where: {id: b.id}, include: {items: true}});
  b2.items.filter(i => i.name.startsWith('BB')).forEach(i => console.log(`${i.name} x${i.quantity} (Tag: ${i.systemTag})`));
  
  // 2. Change to 1250A
  config.currentRating = '1250A';
  await prisma.board.update({where: {id: b.id}, data: {config: JSON.stringify(config)}});
  console.log('\n--- SYNC 2: 1250A ---');
  await syncBoardItems(b.id, config);
  b2 = await prisma.board.findFirst({where: {id: b.id}, include: {items: true}});
  b2.items.filter(i => i.name.startsWith('BB')).forEach(i => console.log(`${i.name} x${i.quantity} (Tag: ${i.systemTag})`));
}
run().catch(console.error);
