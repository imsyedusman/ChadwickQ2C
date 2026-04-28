import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const subcategories = await prisma.catalogItem.findMany({
        where: {
            category: 'Switchboard'
        },
        select: {
            subcategory: true
        },
        distinct: ['subcategory']
    });

    const allSubcats = subcategories.map(s => s.subcategory).filter(Boolean) as string[];
    allSubcats.sort();

    console.log('Unique subcategories for Switchboard:');
    console.log(JSON.stringify(allSubcats, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
