
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugBasics() {
    console.log("Inspecting Basics Items...");

    const items = await prisma.item.findMany({
        where: {
            category: 'Basics'
        },
        take: 5
    });

    for (const item of items) {
        console.log({
            name: item.name,
            isSystemManaged: item.isSystemManaged,
            isDefault: item.isDefault,
            systemTag: item.systemTag,
            systemRuleType: item.systemRuleType
        });
    }
}

debugBasics()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
