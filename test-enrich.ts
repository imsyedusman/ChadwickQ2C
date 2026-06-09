import { fetchEnrichedBoardItems } from './lib/enrichment';
import prisma from './lib/prisma';
async function run() {
  const b = await prisma.board.findFirst();
  const items = await fetchEnrichedBoardItems(b.id);
  const busbars = items.filter(i => i.name.startsWith('BB'));
  console.log(busbars.map(i => ({
    name: i.name,
    category: i.category,
    isCopperPriced: i.isCopperPriced,
    totalCopperWeightKgPerMeter: i.totalCopperWeightKgPerMeter,
    isCatalogMatch: i.isCatalogMatch
  })));
}
run().catch(console.error);
