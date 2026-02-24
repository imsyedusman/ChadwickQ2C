import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const missingMeters = [
    {
        partNumber: 'TCD3X630150CMX',
        description: '3 Phase Current Transformer EM270 Rev 3',
        brand: 'Carlo Gavazzi',
        category: 'Switchboard',
        subcategory: 'Current Transformers',
        unitPrice: 280.54,
        defaultQuantity: 1,
        labourHours: 0.1, // standard default
        isAutoAdd: false
    },
    {
        partNumber: '48250082',
        description: 'Module RS485 DIRIS A-20',
        brand: 'Socomec',
        category: 'Switchboard',
        subcategory: 'Miscellaneous > Metering Accessories',
        unitPrice: 210.83,
        defaultQuantity: 1,
        labourHours: 0.1, // standard default
        isAutoAdd: false
    }
];

async function main() {
    console.log('Starting missing meters idempotent seed...');

    try {
        for (const item of missingMeters) {
            // Note: Prisma schema does not have @unique on CatalogItem.partNumber,
            // therefore findFirst is used here instead of findUnique to avoid TS errors.
            const existing = await (prisma as any).catalogItem.findFirst({
                where: { partNumber: item.partNumber }
            });

            if (existing) {
                // DO NOT update existing records automatically to preserve custom pricing/labour.
                console.log(`[SKIPPED] Existing item found, avoiding overwrite: ${item.partNumber}`);
            } else {
                // Create new record only if it is missing
                await (prisma as any).catalogItem.create({
                    data: item
                });
                console.log(`[CREATED] New item: ${item.partNumber}`);
            }
        }

        console.log('Missing meters seed complete.');
    } catch (error) {
        console.error('Error seeding missing meters:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
