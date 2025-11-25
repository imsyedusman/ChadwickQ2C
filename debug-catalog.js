const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Get sample vendor items
    console.log('\n=== Sample Vendor Items (Power Meters) ===');
    const powerMeters = await prisma.catalogItem.findMany({
        where: {
            subcategory: { contains: 'Power Meters' }
        },
        take: 5
    });
    console.log(JSON.stringify(powerMeters, null, 2));

    console.log('\n=== Sample Vendor Items (Current Transformers) ===');
    const currentTransformers = await prisma.catalogItem.findMany({
        where: {
            subcategory: { contains: 'Current Transformers' }
        },
        take: 5
    });
    console.log(JSON.stringify(currentTransformers, null, 2));

    console.log('\n=== All Unique Subcategories ===');
    const allSubcats = await prisma.catalogItem.findMany({
        select: {
            subcategory: true,
            category: true,
            brand: true
        },
        distinct: ['subcategory'],
        orderBy: {
            subcategory: 'asc'
        }
    });
    console.log(JSON.stringify(allSubcats.slice(0, 20), null, 2));

    console.log('\n=== Count of Items by Category ===');
    const categories = await prisma.catalogItem.groupBy({
        by: ['category'],
        _count: {
            id: true
        }
    });
    console.log(JSON.stringify(categories, null, 2));

    console.log('\n=== Count of Items by Brand ===');
    const brands = await prisma.catalogItem.groupBy({
        by: ['brand'],
        _count: {
            id: true
        }
    });
    console.log(JSON.stringify(brands, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
