
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugItems() {
    console.log("Inspecting System Managed Items...");

    // Fetch a sample of system managed items
    const items = await prisma.item.findMany({
        where: { isSystemManaged: true },
        take: 20
    });

    console.log(`Found ${items.length} system managed items.`);

    for (const item of items) {
        console.log({
            id: item.id,
            name: item.name,
            category: item.category,
            subcategory: item.subcategory,
            isSystemManaged: item.isSystemManaged,
            systemTag: item.systemTag,
            systemRuleType: item.systemRuleType,
            partNumber: item.partNumber
        });
    }
}

debugItems()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
