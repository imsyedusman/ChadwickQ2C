import { syncBoardItems } from './lib/board-item-service';
import prisma from './lib/prisma';
async function run() {
  const b = await prisma.board.findFirst();
  
  async function testConfig(name, changes) {
    const config = JSON.parse(b.config);
    Object.assign(config, changes);
    await prisma.board.update({where: {id: b.id}, data: {config: JSON.stringify(config)}});
    
    // Create catalog items if missing to prevent skipping
    const requiredItems = ['BB-2500A', 'BB-1250A', 'BB-800A', 'BB-400A'];
    for (const pn of requiredItems) {
      const existing = await prisma.catalogItem.findFirst({where: {partNumber: pn}});
      if (!existing) {
        await prisma.catalogItem.create({data: {
          partNumber: pn, category: 'Busbar', description: 'Test', defaultQuantity: 1, unitPrice: 100
        }});
      }
    }

    await syncBoardItems(b.id, config);
    const b2 = await prisma.board.findFirst({where: {id: b.id}, include: {items: true}});
    const relItems = b2.items.filter(i => i.name.startsWith('BB') || i.name.startsWith('CT'));
    console.log(`\n--- ${name} ---`);
    relItems.forEach(i => console.log(`${i.name} x${i.quantity}`));
  }

  await testConfig('800A Board + 400A CT', {
    enclosureType: 'Custom',
    currentRating: '800A',
    ctMetering: 'Yes',
    ctSpareProvision: 'No',
    ctRating: '400A',
    ctType: 'T'
  });

  await testConfig('2500A Board + 1200A CT', {
    enclosureType: 'Custom',
    currentRating: '2500A',
    ctMetering: 'Yes',
    ctSpareProvision: 'No',
    ctRating: '1200A',
    ctType: 'W'
  });

  await testConfig('No Metering Board', {
    enclosureType: 'Custom',
    currentRating: '1250A',
    ctMetering: 'No',
    ctSpareProvision: 'No',
    wholeCurrentMetering: 'No'
  });

}
run().catch(console.error);
