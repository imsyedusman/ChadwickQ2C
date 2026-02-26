import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    const clear = args.includes('--clear');

    console.log('Starting Catalog Import...');
    if (clear) {
        console.log('WARNING: --clear flag detected. Existing catalog will be WIPED.');
    }

    try {
        const filePath = path.join(process.cwd(), 'data', 'catalog-backup.json');
        if (!fs.existsSync(filePath)) {
            throw new Error(`Backup file not found at ${filePath}`);
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const backupData = JSON.parse(fileContent);

        if (backupData.type !== 'catalog_backup' || !Array.isArray(backupData.items)) {
            throw new Error('Invalid backup file format');
        }

        const items = backupData.items;
        console.log(`Found ${items.length} items in backup.`);

        await prisma.$transaction(async (tx) => {
            if (clear) {
                console.log('Clearing existing catalog...');
                await tx.catalogItem.deleteMany({});
            }

            console.log('Importing items...');
            for (const item of items) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, createdAt, updatedAt, ...rest } = item;
                if (!rest.partNumber) {
                    await tx.catalogItem.create({ data: rest });
                    continue;
                }
                const existing = await tx.catalogItem.findUnique({
                    where: { partNumber: rest.partNumber }
                });
                if (existing) {
                    await tx.catalogItem.update({
                        where: { id: existing.id },
                        data: {
                            unitPrice: typeof rest.unitPrice === 'number' ? rest.unitPrice : 0,
                            labourHours: typeof rest.labourHours === 'number' ? rest.labourHours : 0,
                            description: rest.description
                        }
                    });
                } else {
                    await tx.catalogItem.create({ data: rest });
                }
            }

            console.log(`Import finished!`);
        }, { timeout: 300000 });

        console.log('Import successful!');

    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
