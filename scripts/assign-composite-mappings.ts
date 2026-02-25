import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const compositeMappings = [
    {
        parent: 'TRV00121',
        components: [{ partNumber: 'LV434201', quantity: 1 }]
    },
    {
        parent: 'LV434128',
        components: [{ partNumber: 'LV434201', quantity: 1 }]
    },
    {
        parent: 'EM27072DMV53X2SN',
        components: [{ partNumber: 'TCD3X630150CMX', quantity: 2 }]
    },
    {
        parent: '48250500',
        components: [{ partNumber: '48250082', quantity: 1 }]
    },
    {
        parent: '48250501',
        components: [{ partNumber: '48250082', quantity: 1 }]
    }
];

async function main() {
    console.log('Starting composite components mapping...');

    for (const mapping of compositeMappings) {
        // using raw query because prisma client generate failed due to lock
        const items = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, "partNumber", components FROM "CatalogItem" WHERE "partNumber" = $1`,
            mapping.parent
        );

        if (items.length === 0) {
            console.log(`[SKIP] ${mapping.parent} not found in catalog.`);
            continue;
        }

        for (const item of items) {
            // Check if correctly defined already
            const existingStr = item.components ? JSON.stringify(item.components) : null;
            const newStr = JSON.stringify(mapping.components);

            if (existingStr === newStr) {
                console.log(`[SKIP] ${mapping.parent} -> components already correctly defined`);
                continue;
            }

            // We bypass the missing type with executeRawUnsafe
            await prisma.$executeRawUnsafe(
                `UPDATE "CatalogItem" SET "components" = $1::jsonb WHERE id = $2`,
                JSON.stringify(mapping.components),
                item.id
            );

            console.log(`[UPDATE] Mapped parent ${mapping.parent} to components: ${newStr}`);
        }
    }

    console.log('Finished updating composite definitions.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
