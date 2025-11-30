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
            const itemsToCreate = items.map((item: any) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id, createdAt, updatedAt, ...rest } = item;
                return rest;
            });

            const result = await tx.catalogItem.createMany({
                data: itemsToCreate
            });

            console.log(`Imported ${result.count} items.`);
        });

        console.log('Import successful!');

    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
