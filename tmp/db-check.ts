import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Check: Catalog Items ---');
    
    const categories = await prisma.catalogItem.groupBy({
        by: ['category'],
        _count: {
            id: true
        }
    });

    console.log('Categories found in CatalogItem:');
    console.table(categories);

    const checkCategories = ['Basic', 'Busbar', 'basic', 'busbar', 'BUSBAR', 'BASIC'];
    
    for (const cat of checkCategories) {
        const count = await prisma.catalogItem.count({
            where: { category: cat }
        });
        console.log(`Category "${cat}": ${count} items`);
    }

    const sampleItems = await prisma.catalogItem.findMany({
        where: {
            category: {
                in: checkCategories,
                mode: 'insensitive'
            }
        },
        take: 5
    });

    console.log('\nSample Items:');
    console.dir(sampleItems, { depth: null });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
