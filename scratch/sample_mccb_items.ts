import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.catalogItem.findMany({
        where: {
            subcategory: {
                startsWith: 'Circuit Breakers > MCCB >'
            }
        },
        take: 20
    });
    console.log(JSON.stringify(items.map(i => ({ sub: i.subcategory, desc: i.description, part: i.partNumber })), null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
