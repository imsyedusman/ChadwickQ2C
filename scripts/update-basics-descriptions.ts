
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateDescriptions() {
    const updates = [
        { part: '1B-BASE', desc: 'Base Required (Yes = 1)' },
        { part: '1B-SS-2B', desc: 'Extra for Stainless Steel 2B or Painted (Yes = 1)' },
        { part: '1B-SS-NO4', desc: 'Extra for Stainless Steel No.4 Polish (Yes = 1)' }
    ];

    for (const u of updates) {
        await prisma.catalogItem.updateMany({
            where: { partNumber: u.part },
            data: { description: u.desc }
        });
        console.log(`Updated ${u.part} -> ${u.desc}`);
    }
}

updateDescriptions();
