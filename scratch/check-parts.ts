const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { partNumber: { contains: 'IFM' } },
                { partNumber: { contains: 'IFC' } },
                { partNumber: { contains: 'MISC' } }
            ]
        },
        select: {
            partNumber: true,
            description: true,
            category: true
        }
    });

    console.log("Matching items in DB:");
    items.forEach((item: any) => {
        console.log(`Part Number: '${item.partNumber}', Description: '${item.description}'`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
