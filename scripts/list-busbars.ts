import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.catalogItem.findMany({
        where: { category: 'Busbar' },
        select: { subcategory: true },
        distinct: ['subcategory']
    });
    fs.writeFileSync('busbar-cats-utf8.json', JSON.stringify(items.map(i => i.subcategory), null, 2), 'utf8');
}

main().catch(console.error).finally(() => prisma.$disconnect());
