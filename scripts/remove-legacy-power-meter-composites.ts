import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration to remove legacy Power Meter composite mappings...');

    // These are the mappings we are migrating purely to the new POWER_METER_DEPENDENCIES automation.
    const itemsToClean = [
        'TRV00121',
        'LV434128',
        '48250500',
        '48250501'
    ];

    for (const partNumber of itemsToClean) {
        // using raw query because prisma client jsonb update syntax can be tricky
        const items = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, "partNumber", components FROM "CatalogItem" WHERE "partNumber" = $1`,
            partNumber
        );

        if (items.length === 0) {
            console.log(`[SKIP] ${partNumber} not found in catalog.`);
            continue;
        }

        for (const item of items) {
            if (!item.components) {
                console.log(`[SKIP] ${partNumber} -> components already removed`);
                continue;
            }

            await prisma.$executeRawUnsafe(
                `UPDATE "CatalogItem" SET "components" = NULL WHERE id = $1`,
                item.id
            );

            console.log(`[UPDATE] Removed legacy components from parent ${partNumber}`);
        }
    }

    console.log('Finished removing legacy composite mappings.');
}

main()
    .catch((e) => {
        console.error('Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
