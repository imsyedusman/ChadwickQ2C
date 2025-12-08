
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Power Meter items in DB...');
    const items = await prisma.catalogItem.findMany({
        where: {
            subcategory: {
                contains: 'Power Meters'
            }
        },
        take: 10
    });

    console.log(`Found ${items.length} items.`);
    items.forEach(item => {
        console.log(`- [${item.partNumber}] ${item.brand}: ${item.description.substring(0, 30)}... | Type: ${item.meterType}`);
    });

    if (items.length === 0) {
        console.log('No Power Meters found. Do you have any data?');
        const allCount = await prisma.catalogItem.count();
        console.log(`Total items in catalog: ${allCount}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
