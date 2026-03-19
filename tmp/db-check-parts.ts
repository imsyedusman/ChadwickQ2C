import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Check: Specific Items ---');
    
    const parts = ['1B-TIERS-400', '1B-SS-NO4', '1B-PB-TIERS', 'CU-10X3'];
    
    for (const p of parts) {
        const items = await (prisma as any).catalogItem.findMany({
            where: {
                partNumber: {
                    equals: p,
                    mode: 'insensitive'
                }
            }
        });
        console.log(`Part "${p}": ${items.length} itemsFound`);
        items.forEach((i: any) => {
            console.log(` - ID: ${i.id}, Brand: ${i.brand}, Category: ${i.category}, Subcat: ${i.subcategory}`);
        });
    }

    // Check items with no brand
    const noBrand = await (prisma as any).catalogItem.count({
        where: { OR: [{ brand: null }, { brand: '' }] }
    });
    console.log(`Items with NO brand: ${noBrand}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
