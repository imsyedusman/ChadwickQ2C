import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Check: Internal/Chadwick Items ---');
    
    const brands = ['chadwick', 'internal', 'CHADWICK', 'INTERNAL'];
    
    const items = await (prisma as any).catalogItem.findMany({
        where: {
            brand: {
                in: brands,
                mode: 'insensitive'
            }
        }
    });

    console.log(`Found ${items.length} items for brands: ${brands.join(', ')}`);
    items.forEach((i: any) => {
        console.log(`[${i.brand}] ${i.partNumber} (${i.category}) - ${i.description}`);
    });

    // Check for a specific part number in lowercase
    const loweredPart = '1b-tiers-400';
    const foundLower = await (prisma as any).catalogItem.findMany({
        where: { partNumber: loweredPart }
    });
    console.log(`\nPart "${loweredPart}": ${foundLower.length} items found`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
