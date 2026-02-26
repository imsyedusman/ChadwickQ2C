import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for duplicate part numbers in CatalogItem table...');

    const duplicates: any[] = await prisma.$queryRaw`
    SELECT "partNumber", COUNT(*) as "count"
    FROM "CatalogItem"
    GROUP BY "partNumber"
    HAVING COUNT(*) > 1;
  `;

    if (duplicates.length === 0) {
        console.log('Verification passed: 0 duplicate partNumbers found.');
    } else {
        console.error(`\nVerification failed: Found ${duplicates.length} duplicate partNumber(s).`);
        // Need to cast BigInt to Number for console.table if running older node or depending on driver
        const formatted = duplicates.map(d => ({
            partNumber: d.partNumber,
            count: Number(d.count)
        }));
        console.table(formatted);
    }
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
