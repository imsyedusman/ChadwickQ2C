
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const totalCount = await prisma.catalogItem.count();
    console.log(`Total items: ${totalCount}`);

    const categories = await prisma.catalogItem.groupBy({
        by: ['category'],
        _count: { id: true }
    });
    console.log('Categories:', categories);

    const switchboardCount = await prisma.catalogItem.count({
        where: {
            OR: [
                { category: { contains: 'switchboard' } },
                { category: { contains: 'switchgear' } }
            ]
        }
    });
    console.log(`Switchboard/Switchgear items: ${switchboardCount}`);

    // Check subcategories for switchboards
    const subcats = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { category: { contains: 'switchboard' } },
                { category: { contains: 'switchgear' } }
            ]
        },
        select: { subcategory: true },
        distinct: ['subcategory']
    });

    console.log(`Unique Switchboard Subcategories: ${subcats.length}`);
    console.log('First 20 subcategories:', subcats.slice(0, 20).map(s => s.subcategory));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
