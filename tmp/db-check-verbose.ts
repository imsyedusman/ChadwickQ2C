import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Check: Detailed Catalog Items ---');
    
    const countAll = await prisma.catalogItem.count();
    console.log(`Total CatalogItems: ${countAll}`);

    const categories = await prisma.catalogItem.groupBy({
        by: ['category'],
        _count: {
            id: true
        }
    });

    console.log('All Categories in CatalogItem:');
    categories.forEach(c => {
        console.log(`- "${c.category}": ${c._count.id} items`);
    });

    // Check specific items that might be Busbars/Basic but under wrong category
    const samples = await prisma.catalogItem.findMany({
        take: 10
    });
    console.log('\nSample items (first 10):');
    samples.forEach(s => {
        console.log(`[${s.category}] ${s.partNumber} - ${s.description}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
