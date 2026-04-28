import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const categories = ['Basics', 'Switchboard', 'Busbar'];
    for (const cat of categories) {
        const subcats = await prisma.catalogItem.findMany({
            where: { category: cat },
            select: { subcategory: true },
            distinct: ['subcategory']
        });
        console.log(`Unique subcategories for ${cat}:`);
        console.log(JSON.stringify(subcats.map(s => s.subcategory), null, 2));
        console.log('---');
    }
}
main().finally(() => prisma.$disconnect());
