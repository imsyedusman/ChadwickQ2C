import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const items = await prisma.catalogItem.findMany({
        where: {
            description: {
                contains: 'Strider M7',
            }
        },
        orderBy: { createdAt: 'asc' }
    });

    fs.writeFileSync('strider-items.json', JSON.stringify(items, null, 2), 'utf-8');
    console.log('Wrote to strider-items.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
