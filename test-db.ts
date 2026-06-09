import { syncBoardItems } from './lib/board-item-service';
import prisma from './lib/prisma';
async function run() {
  const b = await prisma.board.findFirst();
  
  const config = JSON.parse(b.config);
  config.enclosureType = 'Custom';
  config.currentRating = '2500A';
  config.ctMetering = 'Yes';
  config.ctRating = '1200A';
  config.ctSpareProvision = 'No';
  
  await prisma.board.update({where: {id: b.id}, data: {config: JSON.stringify(config)}});
  
  // Clear busbars
  await prisma.item.deleteMany({where: {boardId: b.id, name: {startsWith: 'BB'}}});

  console.log('Running sync...');
  await syncBoardItems(b.id, config);
  
  const b2 = await prisma.board.findFirst({where: {id: b.id}, include: {items: true}});
  const busbars = b2.items.filter(i => i.name.startsWith('BB'));
  
  busbars.forEach(i => {
    console.log(`\nItem: ${i.name}`);
    console.log(`Desc: ${i.description}`);
    console.log(`Unit Price: ${i.unitPrice}`);
    console.log(`Labour: ${i.labourHours}`);
    console.log(`Category: ${i.category}`);
  });
}
run().catch(console.error);
