
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const isExecute = args.includes('--execute');

    if (!isDryRun && !isExecute) {
        console.error('Please specify mode: --dry-run or --execute');
        process.exit(1);
    }

    console.log(`Starting migration of CatalogItem productFrames... Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);

    // Fetch all CatalogItems that are potentially MCCBs
    // We fetch everything to be safe, or we could filter by category/desc matches
    const items = await prisma.catalogItem.findMany();

    let matchCount = 0;
    let updateCount = 0;
    let skippedCount = 0;

    for (const item of items) {
        let frame: string | null = null;
        // Check Description primarily as PartNumbers are obscure
        const text = (item.description || '').toUpperCase();
        const partNumber = (item.partNumber || '').toUpperCase();

        // Combined text for searching
        const search = `${partNumber} ${text}`;

        // 1. NSX100-250
        // Helper regex to match whole word boundaries or typical part patterns
        // Matches NSX followed by 100/160/250, potentially followed by other chars like F, N, H etc.
        if (/(^|\s|-)NSX(100|160|250)/.test(search)) {
            frame = 'NSX100-250';
        }
        // 2. NSX400-630
        else if (/(^|\s|-)NSX(400|630)/.test(search)) {
            frame = 'NSX400-630';
        }
        // 3. NS630b-1600 (NS630b + NS800/1000/1250/1600)
        else if (/(^|\s|-)NS(800|1000|1250|1600)/.test(search) || /NS630B/.test(search)) {
            frame = 'NS630b-1600';
        }

        // Check if update is needed
        if (frame) {
            matchCount++;

            if (item.productFrame !== frame) {
                if (isExecute) {
                    await prisma.catalogItem.update({
                        where: { id: item.id },
                        data: { productFrame: frame }
                    });
                    console.log(`[UPDATE] ${item.partNumber}: ${item.productFrame || 'NULL'} -> ${frame}`);
                    updateCount++;
                } else {
                    console.log(`[MATCH]  ${item.partNumber}: ${item.productFrame || 'NULL'} -> ${frame}`);
                }
            } else {
                skippedCount++;
                // console.log(`[SKIP]   ${item.partNumber} already set to ${frame}`);
            }
        }
    }

    console.log('------------------------------------------------');
    console.log(`Migration complete.`);
    console.log(`Found Matches: ${matchCount}`);
    console.log(`Updated:       ${updateCount}`);
    console.log(`Skipped:       ${skippedCount} (already correct)`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
