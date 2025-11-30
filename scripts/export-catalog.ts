import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Catalog Export...');

    try {
        const items = await prisma.catalogItem.findMany({
            orderBy: { brand: 'asc' }
        });

        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            type: 'catalog_backup',
            items
        };

        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        const filePath = path.join(dataDir, 'catalog-backup.json');
        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

        console.log(`Export successful!`);
        console.log(`Items: ${items.length}`);
        console.log(`File: ${filePath}`);

    } catch (error) {
        console.error('Export failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
