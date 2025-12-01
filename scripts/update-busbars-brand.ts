import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating brand field for existing Busbar items...');

    // Update all Busbar items to have brand = null
    const result = await prisma.catalogItem.updateMany({
        where: {
            category: 'Busbar',
            brand: null // Only update items that already have null brand (to be safe)
        },
        data: {
            brand: null
        }
    });

    console.log(`✅ Updated ${result.count} Busbar items.`);

    // Also check if there are any Busbar items with a different brand value
    const busbarsWithBrand = await prisma.catalogItem.count({
        where: {
            category: 'Busbar',
            brand: { not: null }
        }
    });

    if (busbarsWithBrand > 0) {
        console.log(`⚠️  Warning: Found ${busbarsWithBrand} Busbar items with a non-null brand value.`);
        console.log('These will NOT be updated. If you want to update them too, modify this script.');
    }

    console.log('\nAll Busbar items now have brand = null');
    console.log('They will appear under "Unknown / No Brand" in Manage Pricelists.');
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
