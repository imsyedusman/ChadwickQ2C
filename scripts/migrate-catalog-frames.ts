
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration of CatalogItem productFrames...');

    // Fetch all CatalogItems that are potentially MCCBs (or all)
    const items = await prisma.catalogItem.findMany();

    let updatedCount = 0;

    for (const item of items) {
        let frame = null;
        // Check Description primarily as PartNumbers are obscure (e.g. C10B3TM050)
        const text = (item.description || '').toUpperCase();

        // NSX100-250 (NSX100, NSX160, NSX250)
        if (/NSX(100|160|250)/.test(text)) {
            frame = 'NSX100-250';
        }
        // NSX400-630 (NSX400, NSX630)
        else if (/NSX(400|630)/.test(text)) {
            frame = 'NSX400-630';
        }
        // High Current: NS800-1600 or NS630b
        else if (/NS(800|1000|1250|1600)/.test(text) || /NS630B/.test(text)) {
            frame = 'NS630b-1600';
        }

        if (frame) {
            await prisma.catalogItem.update({
                where: { id: item.id },
                data: { productFrame: frame }
            });
            updatedCount++;
            console.log(`Updated ${item.partNumber} (${item.description}) -> ${frame}`);
        }
    }

    console.log(`Migration complete. Updated ${updatedCount} items.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
