
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking MccbTripBaseRule table...');
    const rules = await prisma.mccbTripBaseRule.findMany({
        where: {
            tripPartNumber: { startsWith: 'SAU' }
        }
    });

    if (rules.length > 0) {
        console.log('Found potentially conflicting SAU rules:', rules);
    } else {
        console.log('No SAU rules found in MccbTripBaseRule.');
    }
}

main().finally(() => prisma.$disconnect());
