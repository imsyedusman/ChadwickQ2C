import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Global Count ---');
    
    const catalogCount = await prisma.catalogItem.count();
    const itemCount = await prisma.item.count();
    const quoteCount = await prisma.quote.count();
    const boardCount = await prisma.board.count();
    const projectCount = await prisma.project.count();

    console.log(`CatalogItem: ${catalogCount}`);
    console.log(`Item (Quote Instances): ${itemCount}`);
    console.log(`Quote: ${quoteCount}`);
    console.log(`Board: ${boardCount}`);
    console.log(`Project: ${projectCount}`);

    if (catalogCount > 0) {
        const categories = await prisma.catalogItem.groupBy({
            by: ['category'],
            _count: { id: true }
        });
        console.log('\nCategories in CatalogItem:');
        console.table(categories);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
