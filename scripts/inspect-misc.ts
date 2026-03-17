import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const items = await prisma.catalogItem.findMany({
        where: {
            partNumber: {
                in: [
                    'A9C20134', 'CCT15854', 'CCT15443', 'CCT15940', 'CCT15369', 'XB4BD33', 'RM17TG00', 'XB5AVM4'
                ]
            }
        }
    });
    console.log("Known Schneider GC Items:");
    for (const item of items) {
        console.log(`- ${item.partNumber}: category=${item.category}, subcategory=${item.subcategory}, brand=${item.brand}`);
    }

    const otherMisc = await prisma.catalogItem.findMany({
        where: {
            OR: [
                { subcategory: { contains: 'Miscellaneous' } },
                { category: 'Miscellaneous' }
            ],
            NOT: {
                partNumber: { startsWith: 'CHD-' }
            }
        },
        take: 10
    });
    console.log("\nOther DB items with Miscellaneous in cat/subcat (up to 10):");
    for (const item of otherMisc) {
        console.log(`- ${item.partNumber}: category=${item.category}, subcategory=${item.subcategory}, brand=${item.brand}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
