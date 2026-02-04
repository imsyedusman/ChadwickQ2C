
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Removing conflicting SAU rules from MccbTripBaseRule...');
    const result = await prisma.mccbTripBaseRule.deleteMany({
        where: {
            tripPartNumber: { startsWith: 'SAU' }
        }
    });
    console.log(`Deleted ${result.count} conflicting rules.`);
}

main().finally(() => prisma.$disconnect());
