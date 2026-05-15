
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Checking for items with 0 labour hours that might have been wiped...');
    
    // Find items with 0 labour hours
    const wipedItems = await prisma.catalogItem.findMany({
        where: {
            labourHours: 0
        },
        select: {
            partNumber: true,
            brand: true,
            description: true,
            updatedAt: true
        },
        orderBy: {
            updatedAt: 'desc'
        },
        take: 50
    });

    console.log(`Found ${wipedItems.length} items with 0 labour hours (showing last 50):`);
    console.table(wipedItems.map(i => ({
        ...i,
        updatedAt: i.updatedAt.toISOString()
    })));

    const recentImports = await (prisma as any).catalogImport.findMany({
        orderBy: { timestamp: 'desc' },
        take: 5
    });
    console.log('\nRecent Imports:');
    console.table(recentImports);
}

main().catch(console.error).finally(() => prisma.$disconnect());
