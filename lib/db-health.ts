import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function checkDatabaseSchema() {
    try {
        console.log('🏥 Checking database health...');

        // 1. Basic Connection Check
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connection established.');

        // 2. Critical Column Check
        // We verified that 'isSheetmetal' is the missing column causing crashes.
        // querying postgres system catalog to check if column exists
        const result = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Item' AND column_name = 'isSheetmetal';
        ` as any[];

        if (result.length === 0) {
            // Check 'CatalogItem' too as that's likely where it's needed
            const resultCatalog = await prisma.$queryRaw`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'CatalogItem' AND column_name = 'isSheetmetal';
            ` as any[];

            if (resultCatalog.length === 0) {
                console.error('❌ CRITICAL: Database schema mismatch! Column "isSheetmetal" missing.');
                console.error('👉 Fix: Run "npm run db:deploy" on the server.');
                return false;
            }
        }

        console.log('✅ Database schema verified (Critical columns present).');
        return true;
    } catch (error) {
        console.error('❌ Database Health Check Failed:', error);
        return false;
    } finally {
        await prisma.$disconnect();
    }
}
