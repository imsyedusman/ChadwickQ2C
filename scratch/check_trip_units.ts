import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tripUnits = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { description: { contains: 'TRIP UNIT', mode: 'insensitive' } },
                { description: { contains: 'BASE TRIP UNIT', mode: 'insensitive' } }
            ]
        }
    });

    console.log(`Found ${tripUnits.length} trip unit items.`);
    tripUnits.slice(0, 10).forEach(item => {
        console.log(`- [${item.subcategory}] ${item.description} (${item.partNumber})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
