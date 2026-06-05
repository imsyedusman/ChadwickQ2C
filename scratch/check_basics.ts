import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking Basics items...");
    
    const allBasics = await prisma.catalogItem.findMany({
        where: { category: 'Basics' }
    });
    
    console.log(`Total Basics items: ${allBasics.length}`);
    
    let noBrand = 0;
    let internalBrand = 0;
    let otherBrand = 0;
    
    const brandCounts: Record<string, number> = {};
    
    for (const item of allBasics) {
        if (!item.brand) {
            noBrand++;
        } else if (item.brand.toLowerCase() === 'internal') {
            internalBrand++;
        } else {
            otherBrand++;
            brandCounts[item.brand] = (brandCounts[item.brand] || 0) + 1;
        }
    }
    
    console.log(`No brand: ${noBrand}`);
    console.log(`Internal brand: ${internalBrand}`);
    console.log(`Other brand: ${otherBrand}`, brandCounts);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
