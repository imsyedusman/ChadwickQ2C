import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting normalization for Strider M72 and M73 items...');

    const targetDescriptions = [
        'Strider M72 Modbus 96mm',
        'Strider M73 Ethernet 96mm'
    ];

    const itemsToUpdate = await prisma.catalogItem.findMany({
        where: {
            description: {
                in: targetDescriptions
            },
            meterType: null
        }
    });

    if (itemsToUpdate.length === 0) {
        console.log('No Strider M72/M73 items require meterType normalization (meterType is not null).');
        return;
    }

    console.log(`Found ${itemsToUpdate.length} Strider items with null meterType.`);

    const updatedIds: string[] = [];

    for (const item of itemsToUpdate) {
        const updated = await prisma.catalogItem.update({
            where: { id: item.id },
            data: { meterType: 'Special' }
        });
        updatedIds.push(updated.id);
    }

    console.log('\n--- Normalization Summary ---');
    console.log(`Total rows updated: ${updatedIds.length}`);
    console.log('Updated IDs:');
    updatedIds.forEach(id => console.log(`  - ${id}`));
    console.log('Set meterType to "Special" for these rows.');
}

main()
    .catch((e) => {
        console.error('Error running script:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
