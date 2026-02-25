const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.item.findMany({
        where: {
            OR: [
                { description: { contains: 'surge', mode: 'insensitive' } },
                { subcategory: { contains: 'surge', mode: 'insensitive' } },
                { category: { contains: 'surge', mode: 'insensitive' } }
            ]
        },
        select: {
            sku: true,
            partNumber: true,
            description: true,
            category: true,
            subcategory: true
        }
    });
    console.log(JSON.stringify(items, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
