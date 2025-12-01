import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating Surge Protection Device to Service Protection Device...');

    // Find all items with "Surge Protection Device" in description
    const itemsToUpdate = await prisma.catalogItem.findMany({
        where: {
            description: {
                contains: 'Surge Protection Device'
            }
        }
    });

    console.log(`Found ${itemsToUpdate.length} items to update:`);
    itemsToUpdate.forEach(item => {
        console.log(`  - ${item.brand} | ${item.partNumber} | ${item.description}`);
    });

    if (itemsToUpdate.length === 0) {
        console.log('No items found. Exiting.');
        return;
    }

    console.log('\nStarting update...');

    // Update all matching items
    const result = await prisma.catalogItem.updateMany({
        where: {
            description: {
                contains: 'Surge Protection Device'
            }
        },
        data: {
            description: prisma.$queryRawUnsafe(`REPLACE(description, 'Surge Protection Device', 'Service Protection Device')`) as any
        }
    });

    // Since Prisma doesn't support REPLACE in updateMany, we'll update individually
    let updated = 0;
    for (const item of itemsToUpdate) {
        const newDescription = item.description.replace(/Surge Protection Device/g, 'Service Protection Device');
        await prisma.catalogItem.update({
            where: { id: item.id },
            data: { description: newDescription }
        });
        updated++;
    }

    console.log(`\n✅ Successfully updated ${updated} items.`);
    console.log('All "Surge Protection Device" entries have been renamed to "Service Protection Device".');
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
