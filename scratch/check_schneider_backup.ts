
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
    
    const schneiderInBackup = backupItems.filter((i: any) => 
        i.brand && i.brand.toLowerCase().includes('schneider')
    );
    console.log(`Schneider items in backup: ${schneiderInBackup.length}`);
    
    const withLabour = schneiderInBackup.filter((i: any) => i.labourHours > 0);
    console.log(`Schneider items with labour in backup: ${withLabour.length}`);

    if (withLabour.length > 0) {
        console.log('Sample Schneider with labour:');
        console.log(JSON.stringify(withLabour[0], null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
