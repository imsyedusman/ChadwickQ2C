import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting catalog category updates...');

    try {
        // Group A: Metering Accessories
        const accessoriesParts = ['TRV00121', 'LV434128'];
        const resAccessories = await (prisma as any).catalogItem.updateMany({
            where: {
                partNumber: { in: accessoriesParts }
            },
            data: {
                category: 'Switchboard',
                subcategory: 'Miscellaneous > Metering Accessories' // Standardized delimiter
            }
        });
        console.log(`Updated ${resAccessories.count} items to 'Miscellaneous > Metering Accessories'.`);

        // Group B: Contactors
        const contactorParts = ['LC1F115U7', 'LC1F150U7', 'LC1F185U7', 'LC1F225U7'];
        const resContactors = await (prisma as any).catalogItem.updateMany({
            where: {
                partNumber: { in: contactorParts }
            },
            data: {
                category: 'Switchboard',
                subcategory: 'Miscellaneous > Contactor > 3P'
            }
        });
        console.log(`Updated ${resContactors.count} items to 'Miscellaneous > Contactor > 3P'.`);

        console.log('Catalog category updates complete.');
    } catch (error) {
        console.error('Error during category update:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the update script
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
