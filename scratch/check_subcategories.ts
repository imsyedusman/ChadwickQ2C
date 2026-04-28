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

    console.log('Unique subcategories for Switchboard:');
    console.log(JSON.stringify(subcategories.map(s => s.subcategory), null, 2));

    const powerMeters = await prisma.catalogItem.findMany({
        where: {
            category: 'Switchboard',
            subcategory: {
                contains: 'Power'
            }
        },
        select: {
            subcategory: true
        },
        distinct: ['subcategory']
    });

    console.log('\nSubcategories containing "Power":');
    console.log(JSON.stringify(powerMeters.map(s => s.subcategory), null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
