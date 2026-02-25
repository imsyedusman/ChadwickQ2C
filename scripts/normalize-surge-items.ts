import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const surgeItemsToUpdate = [
    { matchDesc: 'TDS-MPM-277', partNumber: 'TDS-MPM-277', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'TDX100C-277/480', partNumber: 'TDX100C-277/480', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'TDX100M-277/480TT', partNumber: 'TDX100M-277/480TT', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'TDX200M-277/480TT', partNumber: 'TDX200M-277/480TT', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'TDS-MT-277', partNumber: 'TDS-MT-277', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'SDN3-100-275', partNumber: 'SDN3-100-275', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'SD3-200', partNumber: 'SD3-200', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'TDS350-TT-277', partNumber: 'TDS350-TT-277', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'DSD340-TNS-275A', partNumber: 'DSD340-TNS-275A', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'DSD140-1SR-275', partNumber: 'DSD140-1SR-275', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'SD3-40N', partNumber: 'SD3-40N', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Diverter' },
    { matchDesc: 'DSF-6A-275V', partNumber: 'DSF-6A-275V', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Filter' },
    { matchDesc: 'DSF-20A-275V', partNumber: 'DSF-20A-275V', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Filter' },
    { matchPart: '2025SF-WE', partNumber: '2025SF-WE', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Filter' },
    { matchPart: '30SFM-OP', partNumber: '30SFM-OP', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Filter' },
    { matchPart: 'C2025SF-WE', partNumber: 'C2025SF-WE', subcategory: 'Miscellaneous > Surge Protection Equipment > Surge Filter' }
];

async function main() {
    console.log('Normailizing Surge Items...');

    const summary: Array<{ id: string; description: string; action: string; diff: any }> = [];

    for (const config of surgeItemsToUpdate) {
        // Find item matching the description OR partNumber depending on config
        const items = await prisma.catalogItem.findMany({
            where: config.matchDesc
                ? { description: { contains: config.matchDesc } }
                : { partNumber: config.matchPart }
        });

        if (items.length === 0) {
            console.log(`[SKIPPED] No item found for ${config.partNumber}`);
            continue;
        }

        for (const item of items) {
            let updatePartNumber = false;
            let currentPartNumber = item.partNumber;
            const diff: any = {};

            if (!item.partNumber || item.partNumber === '') {
                updatePartNumber = true;
                diff.partNumber = { from: item.partNumber, to: config.partNumber };
            } else if (item.partNumber !== config.partNumber) {
                console.log(`[WARNING] Conflict detected for ${item.description}. Existing partNumber = ${item.partNumber}, expected = ${config.partNumber}. Skipping partNumber update.`);
            }

            const updateCategory = item.category !== 'Switchboard' || item.subcategory !== config.subcategory;
            if (updateCategory) {
                if (item.category !== 'Switchboard') diff.category = { from: item.category, to: 'Switchboard' };
                if (item.subcategory !== config.subcategory) diff.subcategory = { from: item.subcategory, to: config.subcategory };
            }

            if (!updatePartNumber && !updateCategory) {
                console.log(`[SKIPPED] ${item.description} already correct.`);
                continue;
            }

            const updateData: any = {};
            if (updatePartNumber) updateData.partNumber = config.partNumber;
            if (updateCategory) {
                if (item.category !== 'Switchboard') updateData.category = 'Switchboard';
                if (item.subcategory !== config.subcategory) updateData.subcategory = config.subcategory;
            }

            await prisma.catalogItem.update({
                where: { id: item.id },
                data: updateData
            });

            console.log(`[UPDATED] ${item.description} -> ${JSON.stringify(diff)}`);
            summary.push({
                id: item.id,
                description: item.description,
                action: 'UPDATED',
                diff
            });
        }
    }

    console.log('\n--- SUMMARY ---');
    console.log(JSON.stringify(summary, null, 2));
    console.log('Finished normalizing surge items.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
