
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const backupPath = path.join(process.cwd(), 'data', 'catalog-backup.json');
    if (!fs.existsSync(backupPath)) {
        console.error(`Backup file not found at ${backupPath}`);
        return;
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const backupItems = backupData.items;
    
    const withLabour = backupItems.filter((i: any) => i.labourHours && i.labourHours !== 0);
    console.log(`Backup items with labour: ${withLabour.length}`);
    if (withLabour.length > 0) {
        console.log('Sample item with labour:');
        console.log(JSON.stringify(withLabour[0], null, 2));
        
        // Check if this specific partNumber exists in the current DB with 0 labour
        const dbMatch = await prisma.catalogItem.findFirst({
            where: { 
                partNumber: withLabour[0].partNumber,
                labourHours: 0
            }
        });
        console.log('\nDB Match (with 0 labour):');
        console.log(dbMatch ? JSON.stringify(dbMatch, null, 2) : 'NOT FOUND');
    }

    const zeroDBItems = await prisma.catalogItem.count({ where: { labourHours: 0 } });
    console.log(`\nTotal items in DB with 0 labour: ${zeroDBItems}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
