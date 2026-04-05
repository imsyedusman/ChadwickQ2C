import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- CATEGORY VERIFICATION STARTED ---');
    
    // Fetch unique categories and subcategories that mention "Busbar" or "Cleat"
    const categories = await prisma.item.findMany({
        select: {
            category: true,
            subcategory: true
        },
        distinct: ['category', 'subcategory']
    });

    const matches = categories.filter(c => 
        (c.category?.includes('Busbar')) || 
        (c.subcategory?.includes('Busbar')) ||
        (c.category?.includes('Cleat')) ||
        (c.subcategory?.includes('Cleat'))
    );

    console.log('Matching Categories/Subcategories:');
    matches.forEach(m => {
        console.log(` - Category: [${m.category}], Subcategory: [${m.subcategory}]`);
    });

    console.log('--- VERIFICATION COMPLETE ---');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
