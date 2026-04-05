import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const item = await prisma.catalogItem.findFirst({
        where: { partNumber: '1B1-CLEAT-SMALL-1' }
    });
    
    const output = {
        partNumber: item?.partNumber,
        category: item?.category,
        subcategory: item?.subcategory
    };
    
    fs.writeFileSync('category_check.json', JSON.stringify(output, null, 2));
    console.log('Results written to category_check.json');
}

main().finally(() => prisma.$disconnect());
