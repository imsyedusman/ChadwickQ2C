import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const itemsToUpdate = [
    { description: 'Fuse and cartridge - 63A', partNumber: 'IPD-FUSE-63A' },
    { description: 'Fuse and cartridge - 32A', partNumber: 'IPD-FUSE-32A' },
    { description: 'Wiring - Digital Meters', partNumber: 'IPD-WIRING-DIGITAL' },
    { description: 'Wiring - surge protection device', partNumber: 'IPD-WIRING-SURGE' },
    { description: 'Stemar (large window)', partNumber: 'STEMAR-LW-CT' }
];

async function main() {
    console.log('Normalizing Core Automation Items...');

    for (const config of itemsToUpdate) {
        const items = await prisma.catalogItem.findMany({
            where: { description: config.description }
        });

        if (items.length === 0) {
            console.log(`[WARNING] No item found for description: "${config.description}"`);
            continue;
        }

        for (const item of items) {
            if (!item.partNumber || item.partNumber === '') {
                await prisma.catalogItem.update({
                    where: { id: item.id },
                    data: { partNumber: config.partNumber }
                });
                console.log(`[UPDATED] Attached partNumber "${config.partNumber}" to "${item.description}"`);
            } else if (item.partNumber === config.partNumber) {
                console.log(`[SKIPPED] "${item.description}" already has correct partNumber "${config.partNumber}"`);
            } else {
                console.log(`[WARNING] "${item.description}" has existing partNumber "${item.partNumber}", skipping update to "${config.partNumber}"`);
            }
        }
    }

    // Insert 20A fuse if missing
    // Strict exact match to avoid touching the DIN variant
    const desc20A = 'Fuse and cartridge - 20A';
    console.log(`\nChecking for "${desc20A}"...`);

    const existing20A = await prisma.catalogItem.findMany({
        where: { description: desc20A }
    });

    if (existing20A.length === 0) {
        console.log(`[UPDATED] Inserting missing "${desc20A}"`);
        await prisma.catalogItem.create({
            data: {
                description: desc20A,
                brand: 'IPD',
                partNumber: 'IPD-FUSE-20A',
                unitPrice: 5.40,
                labourHours: 0.1,
                category: 'Switchboard',
                subcategory: 'Miscellaneous > Fuses'
            }
        });
    } else {
        for (const item of existing20A) {
            if (!item.partNumber || item.partNumber === '') {
                await prisma.catalogItem.update({
                    where: { id: item.id },
                    data: { partNumber: 'IPD-FUSE-20A' }
                });
                console.log(`[UPDATED] Attached partNumber "IPD-FUSE-20A" to existing "${item.description}"`);
            } else if (item.partNumber === 'IPD-FUSE-20A') {
                console.log(`[SKIPPED] "${item.description}" already has correct partNumber`);
            } else {
                console.log(`[WARNING] "${item.description}" has existing partNumber "${item.partNumber}", skipping update`);
            }
        }
    }

    console.log('\nFinished normalizing core automation items.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
