import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Starting Protection Verification...');

    // 1. Check Connection & URL
    const dbUrl = process.env.DATABASE_URL || 'NOT_SET';
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`🔌 Connecting to: ${maskedUrl}`);

    try {
        // 2. Count Quotes
        const quoteCount = await prisma.quote.count();
        console.log(`\n📄 Quotes found: ${quoteCount}`);

        if (quoteCount > 0) {
            const lastQuotes = await prisma.quote.findMany({
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: { id: true, quoteNumber: true, clientName: true, status: true, updatedAt: true }
            });
            console.table(lastQuotes);
        } else {
            console.log('   (No quotes found)');
        }

        // 3. Count Catalog Items
        const catalogCount = await prisma.catalogItem.count();
        console.log(`\n📦 Catalog Items found: ${catalogCount}`);

        if (catalogCount > 0) {
            const sampleItems = await prisma.catalogItem.findMany({
                take: 5,
                select: { id: true, brand: true, category: true, subcategory: true, partNumber: true }
            });
            console.table(sampleItems);
        } else {
            console.log('   (No catalog items found)');
        }

        // 4. Schema/Col Check (Optional verification of the column causing issues)
        console.log('\n🏥 Checking Critical Columns...');
        try {
            // Raw query to check if we can query the 'isSheetmetal' column
            // We use a raw query because if the Prisma Client types are out of sync, a normal query might fail/succeed differently
            // but we want to know if the DB physically has it.
            const result = await prisma.$queryRaw`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'CatalogItem' AND column_name = 'isSheetmetal';
            ` as any[];

            if (result.length > 0) {
                console.log('✅ Column "isSheetmetal" exists in CatalogItem.');
            } else {
                console.error('❌ Column "isSheetmetal" is MISSING in CatalogItem.');
            }
        } catch (e) {
            console.log('⚠️ Failed to check schema info:', e);
        }

    } catch (error) {
        console.error('❌ Verification Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
