import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const items = [
        '1B-TIERS-400',
        '1B-COMPARTMENTS',
        '1B-BASE',
        '1B-DOORS',
        '1B-600MM',
        '1B-800MM',
        '1B-SS-2B',
        '1B-SS-NO4'
    ];

    for (const part of items) {
        const dbItem = await prisma.catalogItem.findFirst({
            where: { partNumber: part }
        });
        console.log(`${part}: $${dbItem?.unitPrice ?? 'Not Found'}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
