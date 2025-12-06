
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCatalog() {
    const items = ['1B-BASE', '1B-SS-2B', '1B-SS-NO4'];
    const results = await prisma.catalogItem.findMany({
        where: { partNumber: { in: items } }
    });

    const formatted = results.map(r => ({ part: r.partNumber, desc: r.description }));
    console.log(JSON.stringify(formatted, null, 2));

    // If missing, I might need to seed them to satisfy the requirement
    const missing = items.filter(i => !results.find(r => r.partNumber === i));
    console.log("Missing Items:", missing);
}

checkCatalog();
