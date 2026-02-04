import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const tripUnits = ['C1035E100', 'C1635E160', 'C2535E250'];
    const output: string[] = [];
    output.push(`Searching for Trip Units: ${tripUnits.join(', ')}`);

    const items = await prisma.catalogItem.findMany({
        where: {
            partNumber: { in: tripUnits }
        }
    });

    output.push(`Found ${items.length} items.`);
    items.forEach(item => {
        output.push(`ID: ${item.id} | Part: ${item.partNumber} | Desc: ${item.description} | Cat: ${item.category}/${item.subcategory}`);
    });

    fs.writeFileSync('debug-output.txt', output.join('\n'));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
