import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const subs = await prisma.catalogItem.findMany({
        where: {
            subcategory: {
                contains: 'MCCB'
            }
        },
        select: {
            subcategory: true
        },
        distinct: ['subcategory']
    });
    console.log(JSON.stringify(subs.map(s => s.subcategory), null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
