
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- All Rules by Type ---');
    const allRules = await prisma.pairingRule.findMany();
    const byType = {};
    allRules.forEach(r => {
        if (!byType[r.ruleType]) byType[r.ruleType] = 0;
        byType[r.ruleType]++;
    });
    console.log('Rule counts by type:', byType);

    // Output sample of each
    for (const type of Object.keys(byType)) {
        console.log(`\nSample for ${type}:`);
        const sample = allRules.filter(r => r.ruleType === type).slice(0, 3);
        sample.forEach(r => console.log(`${r.inputPartNumber} -> ${r.outputPartNumber}`));
    }

    console.log('\n--- SAU Chassis in Catalog ---');
    const sau = await prisma.catalogItem.findMany({
        where: {
            partNumber: { startsWith: 'SAU' }
        },
        select: { partNumber: true, description: true }
    });
    console.log(`Found ${sau.length} SAU items.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
